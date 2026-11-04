/* ==========================================================================
   CONTROLLER: USUARIOS (solo Administrador)
   --------------------------------------------------------------------------
   Cada función: lee la petición -> llama al service -> responde.
   Si el service lanza un error, se pasa a next(error) y el errorHandler
   responde { message, fieldErrors } con el status correcto.
   req.user.id es el administrador que hace la acción (sale del token).
   ========================================================================== */

import * as usersService from '../services/users.service.js';

/** GET /api/users */
export async function list(req, res, next) {
  try {
    res.json(await usersService.listUsers());
  } catch (error) {
    next(error);
  }
}

/** POST /api/users -> 201 Created con el usuario nuevo */
export async function create(req, res, next) {
  try {
    const user = await usersService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/users/:id */
export async function update(req, res, next) {
  try {
    res.json(await usersService.updateUser(req.user.id, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/users/:id/active  body: { active: true|false } */
export async function setActive(req, res, next) {
  try {
    res.json(await usersService.setUserActive(req.user.id, req.params.id, req.body.active));
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/users/:id -> 204 No Content (borrado, no hay nada que devolver) */
export async function remove(req, res, next) {
  try {
    await usersService.deleteUser(req.user.id, req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
