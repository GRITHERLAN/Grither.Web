/* ==========================================================================
   RUTAS: OFERTA  (/api/services y /api/plans)
   --------------------------------------------------------------------------
   GET es público (lo ve cualquier visitante en la página Servicios).
   PUT reemplaza la lista completa y es solo del Administrador.
   ========================================================================== */

import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import * as offersController from '../controllers/offers.controller.js';

const router = Router();

router.get('/services', offersController.getServices);
router.put('/services', requireAuth, requireAdmin, offersController.saveServices);

router.get('/plans', offersController.getPlans);
router.put('/plans', requireAuth, requireAdmin, offersController.savePlans);

export default router;
