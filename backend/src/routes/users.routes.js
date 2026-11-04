/* ==========================================================================
   RUTAS: USUARIOS  (/api/users)
   --------------------------------------------------------------------------
   Aquí el MÉTODO HTTP es la acción (ya no hay un campo "action" en el body,
   como tenía la Edge Function):
     GET    /            -> listar
     POST   /            -> crear
     PATCH  /:id         -> editar
     PATCH  /:id/active  -> activar o inactivar
     DELETE /:id         -> borrar
   ========================================================================== */

import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import * as usersController from '../controllers/users.controller.js';

const router = Router();

/* router.use aplica estos middlewares a TODAS las rutas de este archivo:
   primero se revisa la sesión y después que sea administrador. */
router.use(requireAuth, requireAdmin);

router.get('/', usersController.list);
router.post('/', usersController.create);
router.patch('/:id', usersController.update);
router.patch('/:id/active', usersController.setActive);
router.delete('/:id', usersController.remove);

export default router;
