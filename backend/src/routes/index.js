/* ==========================================================================
   ÍNDICE DE RUTAS
   --------------------------------------------------------------------------
   Junta todas las rutas bajo /api. Leyendo este archivo se ve el mapa
   completo de la API.
   ========================================================================== */

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import projectsRoutes from './projects.routes.js';
import portfolioRoutes from './portfolio.routes.js';
import offersRoutes from './offers.routes.js';
import siteInfoRoutes from './siteInfo.routes.js';
import uploadsRoutes from './uploads.routes.js';

const router = Router();

/* Ruta de prueba: sirve para saber si el servidor está vivo */
router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/projects', projectsRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/uploads', uploadsRoutes);

/* Estas dos se montan en "/" porque cada archivo define varias rutas:
   offers -> /services y /plans; siteInfo -> /contact y /about */
router.use('/', offersRoutes);
router.use('/', siteInfoRoutes);

export default router;
