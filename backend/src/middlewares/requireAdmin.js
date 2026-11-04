/* ==========================================================================
   MIDDLEWARE: REQUIERE ADMINISTRADOR
   --------------------------------------------------------------------------
   Va SIEMPRE después de requireAuth (necesita req.user).
   Si quien llama no es administrador, la petición se corta con 403.
   Reemplaza a la función SQL private.is_admin() que usaba la RLS.
   ========================================================================== */

import { HttpError } from '../utils/HttpError.js';
import { ROLES } from '../models/user.model.js';

export function requireAdmin(req, res, next) {
  if (req.user?.role !== ROLES.ADMIN) {
    next(new HttpError(403, 'No tienes permiso para realizar esta acción.'));
    return;
  }
  next();
}
