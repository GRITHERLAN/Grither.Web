/* ==========================================================================
   TRADUCCIÓN DE ERRORES DE LA BASE DE DATOS
   --------------------------------------------------------------------------
   Postgres responde con códigos técnicos en inglés. Aquí se convierten en
   HttpError con mensajes en español (los mismos que mostraba antes el
   frontend en services/supabaseErrors.js).

   Códigos de Postgres más comunes:
     23505 -> valor repetido (restricción UNIQUE)
     23503 -> no se puede borrar porque otra tabla lo usa (llave foránea)
     23514 -> un dato no cumple una regla CHECK
     P0001 -> error lanzado a propósito por una función SQL (en español)
   ========================================================================== */

import { HttpError, FIELDS_MESSAGE } from './HttpError.js';

/* Restricción UNIQUE -> campo del formulario y mensaje */
const UNIQUE_FIELDS = {
  projects_pkey: { id: 'Ya existe un proyecto con este ID.' },
  projects_name_unique: { name: 'Ya existe un proyecto con este nombre.' },
  portfolio_title_unique: { title: 'Ya existe un portafolio con este título.' },
  plans_single_featured: { list: 'Solo un plan puede ser "Más elegido".' },
  profiles_email_key: { email: 'Ya existe una cuenta con este correo.' },
};

/**
 * Convierte un error de supabase-js en un HttpError.
 * @param {object} error - Error que devolvió Supabase.
 * @param {string} fallback - Mensaje si el error no es de un tipo conocido.
 * @returns {HttpError}
 */
export function toHttpError(error, fallback) {
  // Si ya es un error nuestro, se deja igual
  if (error instanceof HttpError) return error;

  const code = error?.code;
  const text = `${error?.message || ''} ${error?.details || ''}`;

  if (code === '23505') {
    // Se busca qué restricción fue para marcar el campo exacto
    const constraint = Object.keys(UNIQUE_FIELDS).find((name) => text.includes(name));
    if (constraint) return new HttpError(400, FIELDS_MESSAGE, UNIQUE_FIELDS[constraint]);
    return new HttpError(400, 'Ese registro ya existe.');
  }
  if (code === '23503') {
    return new HttpError(409, 'No se puede borrar porque tiene información relacionada (por ejemplo, proyectos asignados).');
  }
  if (code === '23514') {
    return new HttpError(400, 'Algún dato no cumple las reglas. Revisa el formulario.');
  }

  /* P0001: error lanzado a propósito por un trigger SQL (ya viene en español).
     Solo puede pasar mientras los triggers sigan en la BD (antes de correr
     database/sql/02_remove_db_code.sql); después esta regla vive en JS. */
  if (code === 'P0001' && error.message) {
    return new HttpError(400, error.message);
  }

  /* Error desconocido: se guarda el detalle técnico en "cause" para que el
     errorHandler lo escriba en la consola del servidor (el usuario solo ve
     el mensaje en español). */
  const unknown = new HttpError(500, fallback);
  unknown.cause = error;
  return unknown;
}

/**
 * Atajo para revisar la respuesta de Supabase: si trae error, lo lanza ya
 * traducido; si no, devuelve los datos.
 * Ej: const rows = check(await supabase.from('plans').select(), 'No se pudieron cargar los planes.');
 */
export function check({ data, error }, fallback) {
  if (error) throw toHttpError(error, fallback);
  return data;
}
