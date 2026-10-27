/* ==========================================================================
   TRADUCCIÓN DE ERRORES DE SUPABASE
   --------------------------------------------------------------------------
   Supabase (Postgres) responde con códigos técnicos en inglés. Aquí se
   convierten en los mismos errores de siempre (AppError / ValidationError)
   con mensajes en español, para que la interfaz los muestre igual que antes.

   Códigos de Postgres más comunes:
     23505 -> valor repetido (restricción UNIQUE)
     23503 -> no se puede borrar porque otra tabla lo usa (llave foránea)
     23514 -> un dato no cumple una regla CHECK
     42501 -> sin permiso (RLS)
     P0001 -> error lanzado a propósito por una función (ya viene en español)
   ========================================================================== */

import { AppError, ValidationError } from './errors.js';

/**
 * Convierte cualquier error de Supabase en un AppError o ValidationError.
 * @param {object} error - Error devuelto por supabase-js.
 * @param {string} fallback - Mensaje si el error no es de un tipo conocido.
 * @returns {AppError}
 */
export function toAppError(error, fallback = 'No se pudo completar la acción. Inténtalo de nuevo.') {
  // Si ya es un error nuestro, se deja igual
  if (error instanceof AppError) return error;

  const code = error?.code;
  const text = `${error?.message || ''} ${error?.details || ''}`;

  // Valores repetidos: se indica el campo exacto cuando se reconoce la restricción
  if (code === '23505') {
    if (text.includes('projects_pkey')) {
      return new ValidationError({ id: 'Ya existe un proyecto con este ID.' });
    }
    if (text.includes('projects_name_unique')) {
      return new ValidationError({ name: 'Ya existe un proyecto con este nombre.' });
    }
    if (text.includes('plans_single_featured')) {
      return new ValidationError({ list: 'Solo un plan puede ser "Más elegido".' });
    }
    return new AppError('Ese registro ya existe.');
  }

  if (code === '23503') {
    return new AppError('No se puede borrar porque tiene información relacionada (por ejemplo, proyectos asignados).');
  }

  if (code === '23514') {
    return new AppError('Algún dato no cumple las reglas. Revisa el formulario.');
  }

  if (code === '42501') {
    return new AppError('No tienes permiso para realizar esta acción.');
  }

  // Errores escritos por nosotros en las funciones SQL (ya están en español)
  if (code === 'P0001' && error.message) {
    return new AppError(error.message);
  }

  // Sin internet o servidor caído
  if (/Failed to fetch|NetworkError|Load failed/i.test(text)) {
    return new AppError('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
  }

  return new AppError(fallback);
}
