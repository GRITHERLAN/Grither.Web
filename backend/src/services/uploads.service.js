/* ==========================================================================
   SERVICIO DE SUBIDAS
   --------------------------------------------------------------------------
   Decide si se da permiso para subir un archivo y a dónde.
   Solo se permiten estas combinaciones (cualquier otra se rechaza):
     - site-assets  / portfolio  -> portada del portafolio (JPG, PNG, WEBP)
     - site-assets  / owner      -> foto de "Quién está detrás" (JPG, PNG, WEBP)
     - project-media / <ID>      -> imágenes y videos de un proyecto
   El tamaño máximo lo controla el propio bucket (5 MB y 50 MB).
   ========================================================================== */

import { HttpError } from '../utils/HttpError.js';
import { BUCKETS, createUploadUrl } from './storage.service.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MEDIA_TYPES = [...IMAGE_TYPES, 'image/gif', 'video/mp4', 'video/webm'];

/* Carpetas permitidas en el bucket público */
const SITE_ASSET_FOLDERS = ['portfolio', 'owner'];

/* Forma del ID de un proyecto (la misma del CHECK de la tabla projects) */
const PROJECT_ID_PATTERN = /^[A-Z0-9-]{3,20}$/;

/** Revisa que el bucket, la carpeta y el tipo sean una combinación permitida */
function validateUploadRequest({ bucket, folder, contentType }) {
  if (bucket === BUCKETS.SITE_ASSETS) {
    if (!SITE_ASSET_FOLDERS.includes(folder)) return 'Carpeta no permitida.';
    if (!IMAGE_TYPES.includes(contentType)) return 'Tipo de imagen no permitido. Usa PNG, JPG o WEBP.';
    return '';
  }
  if (bucket === BUCKETS.PROJECT_MEDIA) {
    if (!PROJECT_ID_PATTERN.test(String(folder))) return 'El ID del proyecto no es válido.';
    if (!MEDIA_TYPES.includes(contentType)) {
      return 'Tipo de archivo no permitido. Usa PNG, JPG, WEBP, GIF, MP4 o WEBM.';
    }
    return '';
  }
  return 'Destino de subida no permitido.';
}

/**
 * Da un permiso de subida para UN archivo.
 * @param {object} request - { bucket, folder, contentType }
 * @returns {Promise<{ path, token, publicUrl }>}
 */
export async function createUpload(request) {
  const problem = validateUploadRequest(request);
  if (problem) throw new HttpError(400, problem);
  return createUploadUrl(request.bucket, request.folder, request.contentType);
}
