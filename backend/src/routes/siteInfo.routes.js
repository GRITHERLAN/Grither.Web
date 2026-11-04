/* ==========================================================================
   RUTAS: INFORMACIÓN DEL SITIO  (/api/contact y /api/about)
   --------------------------------------------------------------------------
   GET es público; PUT es solo del Administrador.
   ========================================================================== */

import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import * as siteInfoController from '../controllers/siteInfo.controller.js';

const router = Router();

router.get('/contact', siteInfoController.getContact);
router.put('/contact', requireAuth, requireAdmin, siteInfoController.saveContact);

router.get('/about', siteInfoController.getAbout);
router.put('/about', requireAuth, requireAdmin, siteInfoController.saveAbout);

export default router;
