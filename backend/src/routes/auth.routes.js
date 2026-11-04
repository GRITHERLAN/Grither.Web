/* ==========================================================================
   RUTAS: AUTENTICACIÓN  (/api/auth)
   --------------------------------------------------------------------------
   El login NO pasa por aquí: lo hace el navegador con Supabase Auth.
   Esta ruta solo responde "¿quién soy?" con el token que ya tiene.
   ========================================================================== */

import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.get('/me', requireAuth, authController.getMe);

export default router;
