/* ==========================================================================
   MIDDLEWARE: RUTA NO ENCONTRADA
   --------------------------------------------------------------------------
   Va después de todas las rutas: si ninguna respondió, la URL no existe.
   ========================================================================== */

import { HttpError } from '../utils/HttpError.js';

export function notFound(req, res, next) {
  next(new HttpError(404, `No existe la ruta ${req.method} ${req.originalUrl}.`));
}
