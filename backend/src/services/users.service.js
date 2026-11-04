/* ==========================================================================
   SERVICIO DE USUARIOS (solo el Administrador)
   --------------------------------------------------------------------------
   Reemplaza a la Edge Function "admin-users" (TypeScript) y a dos triggers
   SQL que había en la base de datos:
     - handle_new_user  -> ahora createUser crea el perfil aquí mismo.
     - guard_last_admin -> ahora hasAnotherActiveAdmin() revisa la regla.

   Reglas (se revisan SIEMPRE aquí, aunque el formulario ya las revisó):
     - Un administrador no puede inactivarse, borrarse ni cambiar su propio rol.
     - Siempre debe quedar al menos un administrador activo.
     - No se puede borrar un usuario que tenga proyectos asignados.
     - El correo no se puede repetir.
   "actorId" es el administrador que hace la acción: sale del token (req.user),
   nunca de lo que manda el formulario.
   ========================================================================== */

import { supabase } from '../database/supabase.js';
import { HttpError, FIELDS_MESSAGE, throwIfInvalid } from '../utils/HttpError.js';
import { check, toHttpError } from '../utils/dbErrors.js';
import { MAX_LENGTH, cleanText, isTooLong, isValidEmail } from '../utils/validators.js';
import { PROFILE_COLUMNS, ROLES, toUser } from '../models/user.model.js';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_TAKEN = 'Ya existe una cuenta con este correo.';
const LAST_ADMIN = 'Debe quedar al menos un administrador activo.';

/* "Bloqueado para siempre" en Supabase Auth (100 años) y "sin bloqueo" */
const BAN_FOREVER = '876000h';
const NO_BAN = 'none';

/* --------------------------------------------------------------------------
   Validaciones (funciones puras: no leen la base de datos)
   -------------------------------------------------------------------------- */

/** Mínimo 8 caracteres, máximo 72, con al menos una letra y un número */
export function getPasswordError(password) {
  const text = String(password ?? '');
  if (text.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (text.length > MAX_LENGTH.PASSWORD) return `La contraseña puede tener máximo ${MAX_LENGTH.PASSWORD} caracteres.`;
  if (!/[A-Za-z]/.test(text) || !/\d/.test(text)) return 'La contraseña debe incluir al menos una letra y un número.';
  return '';
}

/** Revisa nombre y correo (compartido por crear y editar) */
function validateNameAndEmail({ name, email }, errors) {
  if (cleanText(name).length < 3) errors.name = 'Escribe el nombre (mínimo 3 letras).';
  else if (isTooLong(name, MAX_LENGTH.PERSON_NAME)) errors.name = `El nombre puede tener máximo ${MAX_LENGTH.PERSON_NAME} caracteres.`;

  if (!isValidEmail(email) || isTooLong(email, MAX_LENGTH.EMAIL)) {
    errors.email = 'Escribe un correo válido, por ejemplo cliente@correo.com.';
  }
}

/** Datos para crear un cliente. consent = autorización escrita (art. 9 Ley 1581 de 2012) */
function validateNewUser(data) {
  const errors = {};
  validateNameAndEmail(data, errors);
  const passwordError = getPasswordError(data.password);
  if (passwordError) errors.password = passwordError;
  if (data.consent !== true) {
    errors.consent = 'Confirma que el cliente autorizó el tratamiento de sus datos antes de crear la cuenta.';
  }
  return errors;
}

/** Datos para editar. La contraseña es opcional: vacía = no se cambia */
function validateUserUpdate(data) {
  const errors = {};
  validateNameAndEmail(data, errors);
  if (![ROLES.ADMIN, ROLES.USER].includes(data.role)) errors.role = 'Selecciona un rol.';
  if (data.password && getPasswordError(data.password)) errors.password = getPasswordError(data.password);
  return errors;
}

/* --------------------------------------------------------------------------
   Consultas de apoyo
   -------------------------------------------------------------------------- */

/** Lee el perfil o lanza 404 si ya no existe */
async function getProfileOrFail(userId) {
  const row = check(
    await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle(),
    'No se pudo leer el usuario.'
  );
  if (!row) throw new HttpError(404, 'El usuario ya no existe. Recarga la página.');
  return row;
}

/** ¿Hay OTRO administrador activo además de userId? (antes: trigger guard_last_admin) */
async function hasAnotherActiveAdmin(userId) {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', ROLES.ADMIN)
    .eq('active', true)
    .neq('id', userId);
  if (error) throw toHttpError(error, 'No se pudo revisar los administradores.');
  return count > 0;
}

/** ¿Otro usuario ya usa este correo? */
async function isEmailTaken(email, ignoreUserId = null) {
  let query = supabase.from('profiles').select('id').eq('email', email);
  if (ignoreUserId) query = query.neq('id', ignoreUserId);
  const rows = check(await query.limit(1), 'No se pudo revisar el correo.');
  return rows.length > 0;
}

/** Convierte los errores de Supabase Auth en mensajes del formulario */
function toAuthError(error, fallback) {
  if (/already|registered|exists/i.test(error.message)) {
    return new HttpError(400, FIELDS_MESSAGE, { email: EMAIL_TAKEN });
  }
  if (/password/i.test(error.message)) {
    return new HttpError(400, FIELDS_MESSAGE, { password: 'La contraseña es muy débil. Usa una más larga.' });
  }
  return toHttpError(error, fallback);
}

/* --------------------------------------------------------------------------
   Acciones
   -------------------------------------------------------------------------- */

/** Lista de todos los usuarios, del más antiguo al más nuevo */
export async function listUsers() {
  const rows = check(
    await supabase.from('profiles').select(PROFILE_COLUMNS).order('created_at'),
    'No se pudieron cargar los usuarios.'
  );
  return rows.map(toUser);
}

/**
 * Crea un cliente (rol "usuario", activo) con su cuenta de acceso y su perfil.
 * @param {object} data - { name, email, password, consent }
 */
export async function createUser(data) {
  const errors = validateNewUser(data);
  const email = cleanText(data.email).toLowerCase();
  if (!errors.email && (await isEmailTaken(email))) errors.email = EMAIL_TAKEN;
  throwIfInvalid(errors);

  const name = cleanText(data.name);

  // 1) Cuenta de acceso en Supabase Auth (ahí se guarda la contraseña cifrada)
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true, // el admin la crea: no hace falta confirmar el correo
    user_metadata: { name },
    app_metadata: { role: ROLES.USER },
  });
  if (error) throw toAuthError(error, 'No se pudo crear la cuenta.');

  /* 2) Perfil en la tabla profiles (antes lo creaba el trigger handle_new_user).
     Se usa upsert ("insertar o actualizar"): mientras el trigger siga en la BD
     ya habrá creado la fila y aquí solo se completa; cuando se borre el
     trigger, aquí se crea. Funciona igual en los dos casos. */
  const { data: row, error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: created.user.id, name, email, role: ROLES.USER, active: true, consent_at: new Date().toISOString() })
    .select(PROFILE_COLUMNS)
    .single();

  if (profileError) {
    // Sin perfil la cuenta no sirve: se borra para no dejarla a medias
    await supabase.auth.admin.deleteUser(created.user.id);
    throw toHttpError(profileError, 'No se pudo crear el perfil del usuario.');
  }
  return toUser(row);
}

/**
 * Edita nombre, correo, rol y (si viene) contraseña.
 * @param {string} actorId - Administrador que edita (sale del token).
 */
export async function updateUser(actorId, userId, data) {
  const target = await getProfileOrFail(userId);
  const errors = validateUserUpdate(data);
  const email = cleanText(data.email).toLowerCase();
  if (!errors.email && (await isEmailTaken(email, userId))) errors.email = EMAIL_TAKEN;

  // Cambio de rol: no el propio, y sin dejar el sistema sin administradores
  if (!errors.role && data.role !== target.role) {
    if (userId === actorId) errors.role = 'No puedes cambiar tu propio rol.';
    else if (target.role === ROLES.ADMIN && target.active && !(await hasAnotherActiveAdmin(userId))) {
      errors.role = LAST_ADMIN;
    }
  }
  throwIfInvalid(errors);

  const name = cleanText(data.name);

  // 1) Cuenta de acceso: nombre, correo y contraseña viven en Supabase Auth
  const authChanges = { user_metadata: { name } };
  if (email !== target.email) {
    authChanges.email = email;
    authChanges.email_confirm = true;
  }
  if (data.password) authChanges.password = data.password;
  const { error: authError } = await supabase.auth.admin.updateUserById(userId, authChanges);
  if (authError) throw toAuthError(authError, 'No se pudo actualizar la cuenta.');

  // 2) Perfil (antes el correo lo copiaba el trigger handle_user_email_change)
  const row = check(
    await supabase.from('profiles').update({ name, email, role: data.role }).eq('id', userId).select(PROFILE_COLUMNS).single(),
    'No se pudo guardar el usuario.'
  );
  return toUser(row);
}

/**
 * Activa o inactiva un usuario. Inactivo = no puede iniciar sesión.
 * @param {string} actorId - Administrador que hace el cambio.
 */
export async function setUserActive(actorId, userId, active) {
  const target = await getProfileOrFail(userId);
  const nextActive = active === true;

  if (!nextActive) {
    if (userId === actorId) throw new HttpError(400, 'No puedes inactivar tu propia cuenta.');
    if (target.role === ROLES.ADMIN && !(await hasAnotherActiveAdmin(userId))) throw new HttpError(400, LAST_ADMIN);
  }

  const row = check(
    await supabase.from('profiles').update({ active: nextActive }).eq('id', userId).select(PROFILE_COLUMNS).single(),
    'No se pudo cambiar el estado del usuario.'
  );

  // Se bloquea (o desbloquea) también en Supabase Auth para que no pueda iniciar sesión
  const { error } = await supabase.auth.admin.updateUserById(userId, { ban_duration: nextActive ? NO_BAN : BAN_FOREVER });
  if (error) throw toHttpError(error, 'No se pudo cambiar el acceso del usuario.');

  return toUser(row);
}

/**
 * Borra un usuario definitivamente. Su perfil se borra solo (ON DELETE CASCADE).
 * @param {string} actorId - Administrador que borra.
 */
export async function deleteUser(actorId, userId) {
  const target = await getProfileOrFail(userId);
  if (userId === actorId) throw new HttpError(400, 'No puedes borrar tu propia cuenta.');
  if (target.role === ROLES.ADMIN && target.active && !(await hasAnotherActiveAdmin(userId))) {
    throw new HttpError(400, LAST_ADMIN);
  }

  // No se borra a quien tenga proyectos: primero hay que borrarlos o reasignarlos
  const { count, error: countError } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', userId);
  if (countError) throw toHttpError(countError, 'No se pudo revisar los proyectos del usuario.');
  if (count > 0) {
    const label = count === 1 ? 'proyecto asignado' : 'proyectos asignados';
    throw new HttpError(409, `Este usuario tiene ${count} ${label}. Bórralos o reasígnalos antes de borrar al usuario.`);
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw toHttpError(error, 'No se pudo borrar el usuario.');
}
