/* ==========================================================================
   CONTROLLER: INFORMACIÓN DEL SITIO (Contacto y Sobre mí)
   --------------------------------------------------------------------------
   Leer es público; guardar es solo del Administrador (lo revisa la ruta).
   ========================================================================== */

import * as siteInfoService from '../services/siteInfo.service.js';

/** GET /api/contact */
export async function getContact(req, res, next) {
  try {
    res.json(await siteInfoService.getContactInfo());
  } catch (error) {
    next(error);
  }
}

/** PUT /api/contact */
export async function saveContact(req, res, next) {
  try {
    res.json(await siteInfoService.saveContactInfo(req.body));
  } catch (error) {
    next(error);
  }
}

/** GET /api/about */
export async function getAbout(req, res, next) {
  try {
    res.json(await siteInfoService.getAboutInfo());
  } catch (error) {
    next(error);
  }
}

/** PUT /api/about */
export async function saveAbout(req, res, next) {
  try {
    res.json(await siteInfoService.saveAboutInfo(req.body));
  } catch (error) {
    next(error);
  }
}
