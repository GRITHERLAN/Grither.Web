/* ==========================================================================
   MIDDLEWARE: MANEJADOR DE ERRORES
   --------------------------------------------------------------------------
   Todos los next(error) de la API terminan aquí. Express lo reconoce como
   manejador de errores porque recibe CUATRO parámetros (err, req, res, next).
   Siempre responde con la misma forma, la que ya entiende el frontend:
     { message: 'texto en español', fieldErrors: { campo: 'error' } }
   ========================================================================== */

import { HttpError } from '../utils/HttpError.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Error nuestro (lanzado a propósito por un service o middleware)
  if (err instanceof HttpError) {
    if (err.status >= 500) console.error('Error del servidor:', err.cause || err);
    res.status(err.status).json({ message: err.message, fieldErrors: err.fieldErrors });
    return;
  }

  // El body no era un JSON válido (lo detecta express.json())
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'La petición no tiene un formato válido.' });
    return;
  }

  /* Cualquier otro error es un fallo inesperado: el detalle técnico se
     queda en la consola del servidor y el usuario ve un mensaje genérico
     (nunca se le muestran detalles internos). */
  console.error('Error inesperado:', err);
  res.status(500).json({ message: 'Ocurrió un error en el servidor. Inténtalo de nuevo.' });
}
