/* ==========================================================================
   CONTROLLER: SUBIDAS (solo Administrador)
   ========================================================================== */

import * as uploadsService from '../services/uploads.service.js';

/** POST /api/uploads  body: { bucket, folder, contentType } -> { path, token, publicUrl } */
export async function create(req, res, next) {
  try {
    const upload = await uploadsService.createUpload(req.body);
    res.status(201).json(upload);
  } catch (error) {
    next(error);
  }
}
