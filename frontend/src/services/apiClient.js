/* ==========================================================================
   CLIENTE DE LA API (fetch base)
   --------------------------------------------------------------------------
   TODAS las peticiones al backend pasan por aquí. Así, en un solo lugar:
     1) se llama a "/api/..." en el MISMO dominio de la web (en Cloudflare
        el mismo Worker sirve la web y la API; en local, Vite reenvía /api
        al backend, ver server.proxy en vite.config.js);
     2) se agrega el token de la sesión (header Authorization), que el
        backend usa para saber quién llama;
     3) se convierte la respuesta de error { message, fieldErrors } en los
        mismos errores de siempre (AppError / ValidationError), para que las
        pantallas los sigan mostrando igual.

   El token sale de Supabase Auth (el login sigue en el navegador).
   supabase.auth.getSession() lo renueva solo si está por vencer.
   ========================================================================== */

import { supabase } from '../lib/supabaseClient.js';
import { AppError, ValidationError } from './errors.js';

const OFFLINE_MESSAGE = 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';

/** Devuelve el header Authorization si hay sesión, o un objeto vacío si no */
async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Convierte una respuesta de error del backend en AppError o ValidationError.
 * Se guarda también el status (401, 403, 404...) por si quien llamó lo necesita.
 */
function toError(status, body) {
  const error = body.fieldErrors
    ? new ValidationError(body.fieldErrors, body.message)
    : new AppError(body.message || 'Ocurrió un error en el servidor. Inténtalo de nuevo.');
  error.status = status;
  return error;
}

/**
 * Hace una petición a la API y devuelve el JSON de la respuesta.
 * @param {string} path - Ruta de la API, ej. '/api/projects'.
 * @param {object} [options]
 * @param {string} [options.method] - 'GET' (por defecto), 'POST', 'PUT', 'PATCH' o 'DELETE'.
 * @param {object|Array} [options.body] - Datos a enviar (se convierten a JSON).
 * @returns {Promise<any>} datos de la respuesta (null si no hay contenido).
 */
export async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = { ...(await getAuthHeader()) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch solo falla así cuando no hay internet o el servidor no responde
    throw new AppError(OFFLINE_MESSAGE);
  }

  // 204 = "salió bien, pero no hay nada que devolver" (ej. al borrar)
  if (response.status === 204) return null;

  // Si el cuerpo no es JSON (ej. error de Cloudflare), se usa un objeto vacío
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) throw toError(response.status, data);
  return data;
}
