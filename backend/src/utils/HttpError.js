/* ==========================================================================
   ERROR CON CÓDIGO HTTP
   --------------------------------------------------------------------------
   Los services lanzan este error cuando algo no se puede hacer
   ("no tienes permiso", "el correo ya existe"...). El errorHandler lo
   convierte en la respuesta { message, fieldErrors } con su status.

   Status más usados:
     400 -> datos mal enviados o que no cumplen una regla
     401 -> no hay sesión o venció
     403 -> hay sesión, pero no tiene permiso
     404 -> no existe (o no se puede ver)
     409 -> choca con otro dato (ej. tiene proyectos asignados)
   ========================================================================== */

export class HttpError extends Error {
  /**
   * @param {number} status - Código HTTP de la respuesta.
   * @param {string} message - Mensaje en español listo para mostrar.
   * @param {object} [fieldErrors] - Error de cada campo, ej. { email: 'Ya existe' }.
   */
  constructor(status, message, fieldErrors) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/* Mensaje general cuando hay errores por campo */
export const FIELDS_MESSAGE = 'Revisa los campos marcados en rojo.';

/**
 * Lanza un error 400 si el objeto de errores tiene algo.
 * Se usa después de cada validación: if (hay errores) -> no se sigue.
 */
export function throwIfInvalid(fieldErrors) {
  if (Object.keys(fieldErrors).length > 0) {
    throw new HttpError(400, FIELDS_MESSAGE, fieldErrors);
  }
}
