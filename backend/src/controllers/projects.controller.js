/* ==========================================================================
   CONTROLLER: PROYECTOS
   --------------------------------------------------------------------------
   Leer: cualquiera con sesión (el service filtra qué puede ver cada uno,
   por eso recibe req.user). Escribir: solo el Administrador (lo revisa la ruta).
   ========================================================================== */

import * as projectsService from '../services/projects.service.js';

/** GET /api/projects */
export async function list(req, res, next) {
  try {
    res.json(await projectsService.listProjects(req.user));
  } catch (error) {
    next(error);
  }
}

/** GET /api/projects/taken-keys?ignoreId=GTH-1 */
export async function getTakenKeys(req, res, next) {
  try {
    res.json(await projectsService.getTakenKeys(req.query.ignoreId || null));
  } catch (error) {
    next(error);
  }
}

/** GET /api/projects/:id */
export async function getOne(req, res, next) {
  try {
    res.json(await projectsService.getProject(req.user, req.params.id));
  } catch (error) {
    next(error);
  }
}

/** POST /api/projects */
export async function create(req, res, next) {
  try {
    const project = await projectsService.createProject(req.body);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/projects/:id */
export async function update(req, res, next) {
  try {
    res.json(await projectsService.updateProject(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/projects/:id */
export async function remove(req, res, next) {
  try {
    await projectsService.deleteProject(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/projects/:id/status  body: { status: 'activo'|'inactivo' } */
export async function setStatus(req, res, next) {
  try {
    res.json(await projectsService.setProjectStatus(req.params.id, req.body.status));
  } catch (error) {
    next(error);
  }
}

/** POST /api/projects/:id/complete */
export async function complete(req, res, next) {
  try {
    res.json(await projectsService.completeProject(req.params.id));
  } catch (error) {
    next(error);
  }
}

/** POST /api/projects/:id/cancel  body: { reason } */
export async function cancel(req, res, next) {
  try {
    res.json(await projectsService.cancelProject(req.params.id, req.body.reason));
  } catch (error) {
    next(error);
  }
}
