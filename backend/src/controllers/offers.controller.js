/* ==========================================================================
   CONTROLLER: OFERTA (servicios y planes)
   --------------------------------------------------------------------------
   Leer es público; guardar es solo del Administrador (lo revisa la ruta).
   Al guardar, el body es la LISTA completa de cards, en orden.
   ========================================================================== */

import * as offersService from '../services/offers.service.js';

/** GET /api/services */
export async function getServices(req, res, next) {
  try {
    res.json(await offersService.getServices());
  } catch (error) {
    next(error);
  }
}

/** PUT /api/services  body: [ { id, icon, title, description, tags } ] */
export async function saveServices(req, res, next) {
  try {
    res.json(await offersService.saveServices(req.body));
  } catch (error) {
    next(error);
  }
}

/** GET /api/plans */
export async function getPlans(req, res, next) {
  try {
    res.json(await offersService.getPlans());
  } catch (error) {
    next(error);
  }
}

/** PUT /api/plans  body: [ { id, name, price, description, features, cta, cta_url, featured } ] */
export async function savePlans(req, res, next) {
  try {
    res.json(await offersService.savePlans(req.body));
  } catch (error) {
    next(error);
  }
}
