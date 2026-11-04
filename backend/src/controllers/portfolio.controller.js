/* ==========================================================================
   CONTROLLER: PORTAFOLIO
   --------------------------------------------------------------------------
   Leer es público; crear, editar y borrar es solo del Administrador.
   ========================================================================== */

import * as portfolioService from '../services/portfolio.service.js';

/** GET /api/portfolio */
export async function list(req, res, next) {
  try {
    res.json(await portfolioService.getPortfolio());
  } catch (error) {
    next(error);
  }
}

/** POST /api/portfolio  body: { title, description, category, stack, url, type, imageUrl } */
export async function create(req, res, next) {
  try {
    const item = await portfolioService.createPortfolioItem(req.body);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/portfolio/:id  body: { ...campos, imageAction: 'keep'|'remove'|'replace', imageUrl } */
export async function update(req, res, next) {
  try {
    res.json(await portfolioService.updatePortfolioItem(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/portfolio/:id */
export async function remove(req, res, next) {
  try {
    await portfolioService.deletePortfolioItem(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
