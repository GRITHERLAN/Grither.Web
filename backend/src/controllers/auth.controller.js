/* ==========================================================================
   CONTROLLER: AUTENTICACIÓN
   --------------------------------------------------------------------------
   Un controller traduce HTTP <-> JavaScript:
     - lee lo que llegó en la petición (req.params, req.body, req.user),
     - llama al service,
     - responde con res.json(...).
   Nunca toca la base de datos (eso es trabajo del service).
   ========================================================================== */

/** GET /api/auth/me -> el usuario dueño del token (ya lo dejó requireAuth en req.user) */
export function getMe(req, res) {
  res.json(req.user);
}
