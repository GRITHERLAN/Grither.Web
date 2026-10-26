/* ==========================================================================
   SERVICIO DE AUTENTICACIÓN (Login y usuarios con LocalStorage)
   --------------------------------------------------------------------------
   Simula un backend de usuarios:
     - Los usuarios se guardan en LocalStorage (clave "grither_users").
     - Las contraseñas NUNCA se guardan en texto plano: se guarda su hash.
     - La sesión activa se guarda en LocalStorage si el usuario marcó
       "Recordarme", o en sessionStorage (se borra al cerrar el navegador).
   ========================================================================== */

import { readStorage, writeStorage, removeStorage, STORAGE_KEYS } from './storage.js';
import { AppError, ValidationError } from './errors.js';
import { isValidEmail, normalizeText } from '../utils/validators.js';

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
const MIN_PASSWORD_LENGTH = 6;

/* --------------------------------------------------------------------------
   Utilidades internas
   -------------------------------------------------------------------------- */

/**
 * Convierte una contraseña en un hash SHA-256 (texto hexadecimal).
 * Usa la API nativa del navegador "crypto.subtle".
 * Si no está disponible (por ejemplo al abrir la web por http en otra IP),
 * usa un hash simple de respaldo para que la app siga funcionando.
 */
export async function hashPassword(password) {
  if (window.crypto && window.crypto.subtle) {
    const bytes = new TextEncoder().encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', bytes);
    // Pasamos cada byte a hexadecimal de 2 dígitos y los unimos
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // Respaldo: hash FNV-1a (no es criptográfico, solo evita guardar texto plano)
  let hash = 0x811c9dc5;
  for (let index = 0; index < password.length; index += 1) {
    hash ^= password.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv-${(hash >>> 0).toString(16)}`;
}

/** Genera un id único para un usuario nuevo */
function createUserId() {
  return `USR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * ¿El usuario está activo? Los usuarios creados antes de existir el estado
 * no tienen el campo "active", así que solo es inactivo si vale false.
 */
export function isUserActive(user) {
  return user.active !== false;
}

/** Devuelve una copia del usuario SIN el hash de la contraseña */
function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...publicData } = user;
  return publicData;
}

/* --------------------------------------------------------------------------
   Lectura de usuarios
   -------------------------------------------------------------------------- */

/** Lista completa de usuarios (sin contraseñas) */
export function getUsers() {
  return readStorage(STORAGE_KEYS.USERS, []).map(toPublicUser);
}

/** Lista solo de clientes (rol usuario), usada en el select de proyectos */
export function getClients() {
  return getUsers().filter((user) => user.role === ROLES.USER);
}

/** Busca un usuario por id (sin contraseña) */
export function getUserById(userId) {
  return toPublicUser(readStorage(STORAGE_KEYS.USERS, []).find((user) => user.id === userId));
}

/** Busca un usuario por correo (incluye el hash, solo para uso interno) */
function findUserByEmail(email) {
  const wanted = normalizeText(email);
  return readStorage(STORAGE_KEYS.USERS, []).find((user) => normalizeText(user.email) === wanted);
}

/* --------------------------------------------------------------------------
   Sesión
   -------------------------------------------------------------------------- */

/** Guarda la sesión en el almacenamiento adecuado según "Recordarme" */
function saveSession(userId, remember) {
  // Limpiamos ambos lugares para no dejar sesiones viejas
  removeStorage(STORAGE_KEYS.SESSION, window.localStorage);
  removeStorage(STORAGE_KEYS.SESSION, window.sessionStorage);

  const store = remember ? window.localStorage : window.sessionStorage;
  writeStorage(STORAGE_KEYS.SESSION, { userId, startedAt: new Date().toISOString() }, store);
}

/** Devuelve el usuario con sesión iniciada o null */
export function getCurrentUser() {
  const session =
    readStorage(STORAGE_KEYS.SESSION, null, window.localStorage) ||
    readStorage(STORAGE_KEYS.SESSION, null, window.sessionStorage);

  if (!session) return null;

  const user = getUserById(session.userId);
  // Si el usuario fue inactivado o borrado, su sesión deja de valer
  if (!user || !isUserActive(user)) {
    logout();
    return null;
  }
  return user;
}

/** Cierra la sesión borrándola de ambos almacenamientos */
export function logout() {
  removeStorage(STORAGE_KEYS.SESSION, window.localStorage);
  removeStorage(STORAGE_KEYS.SESSION, window.sessionStorage);
}

/* --------------------------------------------------------------------------
   Login
   -------------------------------------------------------------------------- */

/**
 * Inicia sesión comparando el hash de la contraseña escrita con el guardado.
 * @returns {object} usuario sin contraseña
 */
export async function loginUser({ email, password, remember }) {
  const errors = {};
  if (!isValidEmail(email || '')) errors.email = 'Escribe un correo válido.';
  if (!password) errors.password = 'Escribe tu contraseña.';
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  const user = findUserByEmail(email);
  const passwordHash = await hashPassword(password);

  // Mismo mensaje para "no existe" y "clave errada": no damos pistas a terceros
  if (!user || user.passwordHash !== passwordHash) {
    throw new AppError('Correo o contraseña incorrectos.');
  }

  // Un usuario inactivo no puede entrar hasta que el administrador lo active
  if (!isUserActive(user)) {
    throw new AppError('Tu cuenta está inactiva. Contacta al administrador.');
  }

  saveSession(user.id, Boolean(remember));
  return toPublicUser(user);
}

/* --------------------------------------------------------------------------
   Gestión de usuarios (solo el Administrador)
   --------------------------------------------------------------------------
   Reglas que se controlan aquí ("BackEnd"), no solo en la pantalla:
     - Un administrador no puede inactivarse, borrarse ni cambiar su propio rol.
     - Siempre debe quedar al menos un administrador activo.
     - No se puede borrar un usuario que tenga proyectos asignados.
   -------------------------------------------------------------------------- */

/** ¿Queda otro administrador activo además del indicado? */
function hasAnotherActiveAdmin(users, userId) {
  return users.some(
    (user) => user.id !== userId && user.role === ROLES.ADMIN && isUserActive(user)
  );
}

/** Busca la posición de un usuario o lanza error si no existe */
function findUserIndex(users, userId) {
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) {
    throw new AppError('El usuario ya no existe. Recarga la página.');
  }
  return index;
}

/**
 * Valida los datos de edición de un usuario.
 * La contraseña es opcional: si se deja vacía, no se cambia.
 * @returns {object} errores por campo (vacío = todo bien)
 */
export function validateUserUpdate({ name, email, role, password }, userId) {
  const errors = {};

  if (!name || name.trim().length < 3) {
    errors.name = 'Escribe el nombre de usuario (mínimo 3 letras).';
  }

  if (!isValidEmail(email || '')) {
    errors.email = 'Escribe un correo válido, por ejemplo tu@correo.com.';
  } else {
    // El correo no puede ser de OTRO usuario (el propio sí se permite)
    const owner = findUserByEmail(email);
    if (owner && owner.id !== userId) {
      errors.email = 'Ya existe una cuenta con este correo.';
    }
  }

  if (![ROLES.ADMIN, ROLES.USER].includes(role)) {
    errors.role = 'Selecciona un rol.';
  }

  if (password && password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  return errors;
}

/**
 * Edita nombre, correo, rol y (opcionalmente) contraseña de un usuario.
 * @param {string} userId - Usuario a editar.
 * @param {object} data - { name, email, role, password }
 * @param {string} actorId - Administrador que hace el cambio.
 */
export async function updateUser(userId, data, actorId) {
  const users = readStorage(STORAGE_KEYS.USERS, []);
  const index = findUserIndex(users, userId);
  const target = users[index];

  const errors = validateUserUpdate(data, userId);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  // Reglas sobre el cambio de rol
  if (data.role !== target.role) {
    if (userId === actorId) {
      throw new ValidationError({ role: 'No puedes cambiar tu propio rol.' });
    }
    if (target.role === ROLES.ADMIN && !hasAnotherActiveAdmin(users, userId)) {
      throw new ValidationError({ role: 'Debe quedar al menos un administrador activo.' });
    }
  }

  const updatedUser = {
    ...target,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role,
  };

  // Solo se cambia la contraseña si se escribió una nueva
  if (data.password) {
    updatedUser.passwordHash = await hashPassword(data.password);
  }

  const nextUsers = [...users];
  nextUsers[index] = updatedUser;
  writeStorage(STORAGE_KEYS.USERS, nextUsers);
  return toPublicUser(updatedUser);
}

/** Activa o inactiva un usuario. Un usuario inactivo no puede iniciar sesión. */
export function setUserActive(userId, active, actorId) {
  const users = readStorage(STORAGE_KEYS.USERS, []);
  const index = findUserIndex(users, userId);
  const target = users[index];

  if (!active) {
    if (userId === actorId) {
      throw new AppError('No puedes inactivar tu propia cuenta.');
    }
    if (target.role === ROLES.ADMIN && !hasAnotherActiveAdmin(users, userId)) {
      throw new AppError('Debe quedar al menos un administrador activo.');
    }
  }

  const nextUsers = [...users];
  nextUsers[index] = { ...target, active };
  writeStorage(STORAGE_KEYS.USERS, nextUsers);
  return toPublicUser(nextUsers[index]);
}

/** Borra un usuario definitivamente */
export function deleteUser(userId, actorId) {
  const users = readStorage(STORAGE_KEYS.USERS, []);
  const target = users[findUserIndex(users, userId)];

  if (userId === actorId) {
    throw new AppError('No puedes borrar tu propia cuenta.');
  }
  if (target.role === ROLES.ADMIN && !hasAnotherActiveAdmin(users, userId)) {
    throw new AppError('Debe quedar al menos un administrador activo.');
  }

  // No dejamos proyectos "huérfanos": primero hay que borrarlos o reasignarlos
  const projects = readStorage(STORAGE_KEYS.PROJECTS, []);
  const assigned = projects.filter((project) => project.clientId === userId).length;
  if (assigned > 0) {
    throw new AppError(
      `Este usuario tiene ${assigned} ${assigned === 1 ? 'proyecto asignado' : 'proyectos asignados'}. Bórralos o reasígnalos antes de borrar al usuario.`
    );
  }

  writeStorage(STORAGE_KEYS.USERS, users.filter((user) => user.id !== userId));
}

/* --------------------------------------------------------------------------
   Crear usuarios desde el panel Admin
   -------------------------------------------------------------------------- */

/**
 * Valida los datos para crear un usuario desde el panel.
 * Valida los datos de un usuario nuevo, sin "confirmar contraseña"
 * (el administrador la escribe una sola vez).
 * @returns {object} errores por campo (vacío = todo bien)
 */
export function validateNewUser({ name, email, password }) {
  const errors = {};

  if (!name || name.trim().length < 3) {
    errors.name = 'Escribe el nombre o la empresa (mínimo 3 letras).';
  }

  if (!isValidEmail(email || '')) {
    errors.email = 'Escribe un correo válido, por ejemplo cliente@correo.com.';
  } else if (findUserByEmail(email)) {
    errors.email = 'Ya existe una cuenta con este correo.';
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  return errors;
}

/**
 * Crea un usuario nuevo con rol "usuario" (cliente) y estado activo.
 * NO inicia sesión con la cuenta creada:
 * el administrador sigue con su propia sesión.
 */
export async function createUser(formData) {
  const errors = validateNewUser(formData);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  const newUser = {
    id: createUserId(),
    name: formData.name.trim(),
    email: formData.email.trim().toLowerCase(),
    passwordHash: await hashPassword(formData.password),
    role: ROLES.USER,
    active: true,
    createdAt: new Date().toISOString(),
  };

  const users = readStorage(STORAGE_KEYS.USERS, []);
  writeStorage(STORAGE_KEYS.USERS, [...users, newUser]);
  return toPublicUser(newUser);
}
