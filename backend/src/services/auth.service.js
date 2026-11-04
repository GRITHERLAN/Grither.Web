/* ==========================================================================
   SERVICIO DE AUTENTICACIÓN
   --------------------------------------------------------------------------
   El login lo hace el navegador con Supabase Auth y recibe un token (JWT).
   En cada petición el frontend manda ese token y este servicio responde
   "¿quién es?": verifica el token con Supabase y busca su perfil.
   El token está firmado por Supabase, así que nadie puede inventarse uno.
   ========================================================================== */

import { supabase } from '../database/supabase.js';
import { HttpError } from '../utils/HttpError.js';
import { check } from '../utils/dbErrors.js';
import { PROFILE_COLUMNS, toUser } from '../models/user.model.js';

const EXPIRED_MESSAGE = 'Tu sesión expiró. Vuelve a iniciar sesión.';
export const INACTIVE_MESSAGE = 'Tu cuenta está inactiva. Contacta al administrador.';

/**
 * Devuelve el usuario dueño del token, solo si existe y está activo.
 * @param {string} token - JWT que mandó el frontend.
 * @returns {Promise<object>} usuario { id, name, email, role, active, createdAt }
 */
export async function getUserFromToken(token) {
  if (!token) throw new HttpError(401, EXPIRED_MESSAGE);

  // 1) ¿El token es válido y no ha vencido? (lo revisa Supabase Auth)
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, EXPIRED_MESSAGE);

  // 2) Se busca su perfil para saber su rol y si está activo
  const row = check(
    await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', data.user.id).maybeSingle(),
    'No se pudo leer tu perfil.'
  );

  /* Si el admin lo inactivó o lo borró, su token ya no sirve aunque no
     haya vencido todavía. */
  if (!row || !row.active) throw new HttpError(403, INACTIVE_MESSAGE);
  return toUser(row);
}
