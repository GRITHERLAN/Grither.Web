/* ==========================================================================
   SERVICIO DE AUTENTICACIÓN Y USUARIOS (Supabase Auth)
   --------------------------------------------------------------------------
   - Login: lo hace Supabase Auth. La contraseña NUNCA se compara ni se
     guarda en el navegador; Supabase la guarda cifrada en su servidor.
   - Roles y estado: tabla "profiles" (role = 'admin' | 'usuario', active).
   - Sesión: la guarda supabase-js en localStorage ("Recordarme") o en
     sessionStorage (se borra al cerrar el navegador). Ver lib/supabaseClient.js.
   - Gestión de usuarios (crear, editar correo/contraseña/rol, activar,
     borrar): necesita la llave secreta de Supabase, que NO puede estar en el
     navegador. Por eso se hace en la Edge Function "admin-users", que corre
     en el servidor y vuelve a revisar todas las reglas ("BackEnd").
   ========================================================================== */

import { supabase, setRememberSession } from '../lib/supabaseClient.js';
import { AppError, ValidationError } from './errors.js';
import { toAppError } from './supabaseErrors.js';
import { MAX_LENGTH, isTooLong, isValidEmail } from '../utils/validators.js';

/* Roles posibles de un usuario */
export const ROLES = {
  ADMIN: 'admin',
  USER: 'usuario',
};

/* Texto visible de cada rol */
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.USER]: 'Cliente',
};

/* Longitud mínima de la contraseña */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Revisa que una contraseña sea suficientemente fuerte:
 * mínimo 8 caracteres, con al menos una letra y un número.
 * (El servidor la vuelve a revisar con las mismas reglas.)
 * @returns {string} mensaje de error o cadena vacía si está bien
 */
export function getPasswordError(password) {
  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  // Supabase Auth cifra con bcrypt, que solo usa los primeros 72 caracteres
  if (String(password).length > MAX_LENGTH.PASSWORD) {
    return `La contraseña puede tener máximo ${MAX_LENGTH.PASSWORD} caracteres.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'La contraseña debe incluir al menos una letra y un número.';
  }
  return '';
}

/* Columnas de profiles que usa la app */
const PROFILE_COLUMNS = 'id, name, email, role, active, created_at';

/* Mensaje para cuentas inactivas */
const INACTIVE_MESSAGE = 'Tu cuenta está inactiva. Contacta al administrador.';

/* --------------------------------------------------------------------------
   Utilidades internas
   -------------------------------------------------------------------------- */

/** ¿El usuario está activo? */
export function isUserActive(user) {
  return user.active !== false;
}

/** Convierte una fila de "profiles" en el objeto de usuario que usa la app */
function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
  };
}

/** Lee el perfil de un usuario (nombre, rol y estado) */
async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (error) throw toAppError(error, 'No se pudo leer tu perfil.');
  return toUser(data);
}

/**
 * Llama a la Edge Function "admin-users" (solo el Administrador).
 * La función responde { user } si todo salió bien, o
 * { message, fieldErrors } con el error en español.
 * @param {string} action - 'create' | 'update' | 'setActive' | 'delete'
 * @param {object} payload - Datos de la acción.
 */
async function callAdminUsers(action, payload) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  });

  if (error) {
    // Si el servidor respondió con un error nuestro, leemos su mensaje
    let body = null;
    try {
      body = await error.context?.json();
    } catch {
      body = null;
    }
    if (body?.fieldErrors) throw new ValidationError(body.fieldErrors, body.message);
    if (body?.message) throw new AppError(body.message);
    throw new AppError('No se pudo completar la acción en el servidor. Inténtalo de nuevo.');
  }

  return data;
}

/* --------------------------------------------------------------------------
   Lectura de usuarios
   (La RLS hace que el admin vea todos y un cliente solo a sí mismo.)
   -------------------------------------------------------------------------- */

/** Lista completa de usuarios */
export async function getUsers() {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).order('created_at');
  if (error) throw toAppError(error, 'No se pudieron cargar los usuarios.');
  return data.map(toUser);
}

/** Lista solo de clientes (rol usuario), usada en el select de proyectos */
export async function getClients() {
  return (await getUsers()).filter((user) => user.role === ROLES.USER);
}

/** Busca un usuario por id */
export async function getUserById(userId) {
  return getProfile(userId);
}

/* --------------------------------------------------------------------------
   Sesión
   -------------------------------------------------------------------------- */

/**
 * Devuelve el usuario con sesión iniciada o null.
 * Si el usuario fue inactivado o borrado, su sesión deja de valer.
 */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  const user = await getProfile(session.user.id);
  if (!user || !isUserActive(user)) {
    await logout();
    return null;
  }
  return user;
}

/** Cierra la sesión en este navegador */
export async function logout() {
  // scope 'local': cierra solo esta sesión (no las de otros dispositivos)
  await supabase.auth.signOut({ scope: 'local' });
}

/* --------------------------------------------------------------------------
   Protección contra fuerza bruta (sin CAPTCHA)
   --------------------------------------------------------------------------
   Supabase Auth ya limita los intentos en el servidor. Aquí agregamos una
   espera visible en la pantalla: después de 5 intentos fallidos seguidos,
   el formulario se bloquea 30 s; cada fallo extra duplica la espera
   (60 s, 120 s...) hasta un máximo de 15 minutos.
   El contador vive en memoria (no en LocalStorage, que solo se usa para el
   tema): recargar la página lo reinicia, pero el límite real lo pone el
   servidor de Supabase.
   -------------------------------------------------------------------------- */

const MAX_FREE_ATTEMPTS = 5; // intentos fallidos permitidos sin esperar
const BASE_LOCK_SECONDS = 30; // primera espera
const MAX_LOCK_SECONDS = 15 * 60; // espera máxima (15 minutos)

let failedAttempts = 0; // fallos seguidos
let lockedUntil = 0; // fecha (ms) hasta la que el login está bloqueado

/** Segundos que faltan para poder volver a intentar (0 = puede intentar ya) */
export function getLoginLockSeconds() {
  return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
}

/** Suma un intento fallido y, si ya pasó el límite, bloquea un tiempo */
function registerFailedLogin() {
  failedAttempts += 1;
  if (failedAttempts >= MAX_FREE_ATTEMPTS) {
    const extraFails = failedAttempts - MAX_FREE_ATTEMPTS; // 0, 1, 2...
    const seconds = Math.min(BASE_LOCK_SECONDS * 2 ** extraFails, MAX_LOCK_SECONDS);
    lockedUntil = Date.now() + seconds * 1000;
  }
}

/** Mensaje que se muestra mientras el login está bloqueado */
function lockMessage(seconds) {
  return `Demasiados intentos fallidos. Espera ${seconds} segundos antes de volver a intentarlo.`;
}

/* --------------------------------------------------------------------------
   Login
   -------------------------------------------------------------------------- */

/**
 * Inicia sesión con correo y contraseña (Supabase Auth).
 * @returns {object} usuario (id, name, email, role, active, createdAt)
 */
export async function loginUser({ email, password, remember }) {
  // Si está bloqueado por intentos fallidos, ni siquiera se llama al servidor
  const lockSeconds = getLoginLockSeconds();
  if (lockSeconds > 0) throw new AppError(lockMessage(lockSeconds));

  const errors = {};
  if (!isValidEmail(email || '')) errors.email = 'Escribe un correo válido.';
  if (!password) errors.password = 'Escribe tu contraseña.';
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  // Se decide ANTES de entrar dónde se guardará la sesión
  setRememberSession(Boolean(remember));

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    // Un usuario inactivo queda bloqueado ("banned") en Supabase Auth
    if (error.code === 'user_banned') throw new AppError(INACTIVE_MESSAGE);
    // Sin internet: mensaje distinto para no confundir con clave errada
    if (error.name === 'AuthRetryableFetchError') {
      throw new AppError('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
    }
    // Límite de intentos del servidor de Supabase (protección contra bots)
    if (error.status === 429) {
      throw new AppError('Demasiados intentos. Espera unos minutos antes de volver a intentarlo.');
    }
    // Mismo mensaje para "no existe" y "clave errada": no damos pistas a terceros
    registerFailedLogin();
    const seconds = getLoginLockSeconds();
    throw new AppError(seconds > 0 ? lockMessage(seconds) : 'Correo o contraseña incorrectos.');
  }

  // Entró bien: se reinicia el contador de intentos fallidos
  failedAttempts = 0;
  lockedUntil = 0;

  // Revisamos rol y estado en la tabla profiles
  const user = await getProfile(data.user.id);
  if (!user || !isUserActive(user)) {
    await logout();
    throw new AppError(INACTIVE_MESSAGE);
  }
  return user;
}

/* --------------------------------------------------------------------------
   Gestión de usuarios (solo el Administrador)
   --------------------------------------------------------------------------
   Reglas que se controlan en el servidor (Edge Function + base de datos),
   no solo en la pantalla:
     - Un administrador no puede inactivarse, borrarse ni cambiar su propio rol.
     - Siempre debe quedar al menos un administrador activo.
     - No se puede borrar un usuario que tenga proyectos asignados.
     - El correo no se puede repetir.
   -------------------------------------------------------------------------- */

/**
 * Valida los datos de edición de un usuario (formato de cada campo).
 * La contraseña es opcional: si se deja vacía, no se cambia.
 * Que el correo no esté repetido lo revisa el servidor al guardar.
 * @returns {object} errores por campo (vacío = todo bien)
 */
export function validateUserUpdate({ name, email, role, password }) {
  const errors = {};

  if (!name || name.trim().length < 3) {
    errors.name = 'Escribe el nombre de usuario (mínimo 3 letras).';
  } else if (isTooLong(name, MAX_LENGTH.PERSON_NAME)) {
    errors.name = `El nombre puede tener máximo ${MAX_LENGTH.PERSON_NAME} caracteres.`;
  }

  if (!isValidEmail(email || '') || isTooLong(email, MAX_LENGTH.EMAIL)) {
    errors.email = 'Escribe un correo válido, por ejemplo tu@correo.com.';
  }

  if (![ROLES.ADMIN, ROLES.USER].includes(role)) {
    errors.role = 'Selecciona un rol.';
  }

  if (password && getPasswordError(password)) {
    errors.password = getPasswordError(password);
  }

  return errors;
}

/**
 * Edita nombre, correo, rol y (opcionalmente) contraseña de un usuario.
 * El servidor sabe quién es el administrador por su sesión, así que no hace
 * falta enviarlo (y no se podría falsificar).
 * @param {string} userId - Usuario a editar.
 * @param {object} data - { name, email, role, password }
 */
export async function updateUser(userId, data) {
  const errors = validateUserUpdate(data);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  const result = await callAdminUsers('update', {
    userId,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role,
    password: data.password || '',
  });
  return result.user;
}

/** Activa o inactiva un usuario. Un usuario inactivo no puede iniciar sesión. */
export async function setUserActive(userId, active) {
  const result = await callAdminUsers('setActive', { userId, active: Boolean(active) });
  return result.user;
}

/** Borra un usuario definitivamente (su cuenta de acceso y su perfil) */
export async function deleteUser(userId) {
  await callAdminUsers('delete', { userId });
}

/* --------------------------------------------------------------------------
   Crear usuarios desde el panel Admin
   -------------------------------------------------------------------------- */

/**
 * Valida los datos para crear un usuario desde el panel
 * (sin "confirmar contraseña": el administrador la escribe una sola vez).
 * Que el correo no esté repetido lo revisa el servidor al guardar.
 * consent: el admin confirma que el cliente autorizó POR ESCRITO el
 * tratamiento de sus datos (art. 9 Ley 1581 de 2012). Sin eso, la ley no
 * permite crear la cuenta.
 * @returns {object} errores por campo (vacío = todo bien)
 */
export function validateNewUser({ name, email, password, consent }) {
  const errors = {};

  if (!name || name.trim().length < 3) {
    errors.name = 'Escribe el nombre o la empresa (mínimo 3 letras).';
  } else if (isTooLong(name, MAX_LENGTH.PERSON_NAME)) {
    errors.name = `El nombre puede tener máximo ${MAX_LENGTH.PERSON_NAME} caracteres.`;
  }

  if (!isValidEmail(email || '') || isTooLong(email, MAX_LENGTH.EMAIL)) {
    errors.email = 'Escribe un correo válido, por ejemplo cliente@correo.com.';
  }

  if (!password || getPasswordError(password)) {
    errors.password = getPasswordError(password || '');
  }

  if (!consent) {
    errors.consent = 'Confirma que el cliente autorizó el tratamiento de sus datos antes de crear la cuenta.';
  }

  return errors;
}

/**
 * Crea un usuario nuevo con rol "usuario" (cliente) y estado activo.
 * NO inicia sesión con la cuenta creada: el administrador sigue con la suya
 * (la cuenta la crea el servidor, no el navegador).
 */
export async function createUser(formData) {
  const errors = validateNewUser(formData);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  const result = await callAdminUsers('create', {
    name: formData.name.trim(),
    email: formData.email.trim().toLowerCase(),
    password: formData.password,
    consent: formData.consent === true, // el servidor guarda la fecha en profiles.consent_at
  });
  return result.user;
}
