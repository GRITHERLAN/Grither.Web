/* ==========================================================================
   RUTAS: PROYECTOS  (/api/projects)
   --------------------------------------------------------------------------
   Todas necesitan sesión. Leer: admin o cliente (el service filtra).
   Escribir: solo el Administrador.

   OJO con el orden: "/taken-keys" va ANTES de "/:id". Express revisa las
   rutas de arriba hacia abajo; si "/:id" estuviera primero, tomaría
   "taken-keys" como si fuera el ID de un proyecto.
   ========================================================================== */

import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import * as projectsController from '../controllers/projects.controller.js';

const router = Router();

router.use(requireAuth);

// Lectura (admin o cliente)
router.get('/', projectsController.list);
router.get('/taken-keys', requireAdmin, projectsController.getTakenKeys);
router.get('/:id', projectsController.getOne);

// Escritura (solo admin)
router.post('/', requireAdmin, projectsController.create);
router.patch('/:id', requireAdmin, projectsController.update);
router.delete('/:id', requireAdmin, projectsController.remove);
router.patch('/:id/status', requireAdmin, projectsController.setStatus);
router.post('/:id/complete', requireAdmin, projectsController.complete);
router.post('/:id/cancel', requireAdmin, projectsController.cancel);

export default router;
