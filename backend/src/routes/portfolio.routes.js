/* ==========================================================================
   RUTAS: PORTAFOLIO  (/api/portfolio)
   --------------------------------------------------------------------------
   GET es público; crear, editar y borrar es solo del Administrador.
   ========================================================================== */

import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import * as portfolioController from '../controllers/portfolio.controller.js';

const router = Router();

router.get('/', portfolioController.list);
router.post('/', requireAuth, requireAdmin, portfolioController.create);
router.patch('/:id', requireAuth, requireAdmin, portfolioController.update);
router.delete('/:id', requireAuth, requireAdmin, portfolioController.remove);

export default router;
