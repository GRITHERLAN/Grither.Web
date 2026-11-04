/* ==========================================================================
   ERRORES PERSONALIZADOS
   --------------------------------------------------------------------------
   Los servicios lanzan estos errores y la interfaz los atrapa para mostrar
   el mensaje en pantalla (nunca con alert).
   ========================================================================== */

/** Error general de la aplicación con un mensaje listo para mostrar */
export class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error de validación: además del mensaje general trae un objeto
 * "fieldErrors" con el error de cada campo, por ejemplo:
 *   { id: 'Ese ID ya existe', price: 'El precio debe ser mayor a 0' }
 * Así el formulario puede pintar cada error debajo de su campo.
 */
export class ValidationError extends AppError {
  constructor(fieldErrors, message = 'Revisa los campos marcados en rojo.') {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}
