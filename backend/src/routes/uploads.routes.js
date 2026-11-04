/* ==========================================================================
   RUTAS: SUBIDAS  (/api/uploads)
   --------------------------------------------------------------------------
   Solo el Administrador puede pedir permiso para subir archivos.
   ========================================================================== */

import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import * as uploadsController from '../controllers/uploads.controller.js';

const router = Router();

router.post('/', requireAuth, requireAdmin, uploadsController.create);

export default router;
