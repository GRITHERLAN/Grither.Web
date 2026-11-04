/* ==========================================================================
   MIDDLEWARE: REQUIERE SESIÓN
   --------------------------------------------------------------------------
   Un middleware es una función que corre ANTES del controller. Este revisa
   que la petición traiga un token válido:
     - Si es válido: guarda el usuario en req.user y deja pasar (next()).
     - Si no: corta la petición con un error 401/403 (next(error)).
   Así ningún controller tiene que preguntar "¿quién es?": ya viene en
   req.user, y sale del token (no del body, que se podría falsificar).
   ========================================================================== */

import { getUserFromToken } from '../services/auth.service.js';

export async function requireAuth(req, res, next) {
  try {
    /* El header llega así: "Authorization: Bearer eyJhbGciOi..."
       Se quita la palabra "Bearer " para quedarse solo con el token. */
    const header = req.headers.authorization || '';
    const token = header.replace(/^Bearer\s+/i, '');

    req.user = await getUserFromToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
