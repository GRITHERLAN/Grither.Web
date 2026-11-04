/* ==========================================================================
   SUBIDA DE ARCHIVOS A SUPABASE STORAGE
   --------------------------------------------------------------------------
   Dos buckets:
     - "project-media" (PRIVADO): imágenes y videos de los proyectos.
     - "site-assets" (público): portadas del portafolio y foto de
       "Quién está detrás".

   ¿Cómo se sube un archivo ahora?
     1) Se le pide PERMISO al backend (POST /api/uploads). El backend revisa
        que seas administrador, que el tipo de archivo sea válido, y crea
        una ruta única (UUID) + un permiso de un solo uso.
     2) Con ese permiso, el navegador sube el archivo DIRECTO a Storage
        (los videos pesan hasta 50 MB y no caben en una petición al backend).
   Firmar URLs para ver archivos privados y borrar archivos lo hace siempre
   el backend: el navegador ya no tiene permiso para eso.
   ========================================================================== */

import { supabase } from '../lib/supabaseClient.js';
import { AppError } from './errors.js';
import { apiRequest } from './apiClient.js';

/* Nombres de los buckets (deben coincidir con los de Supabase) */
export const BUCKETS = {
  PROJECT_MEDIA: 'project-media',
  SITE_ASSETS: 'site-assets',
};

/**
 * Sube un archivo y devuelve su ruta y su URL pública (si el bucket es público).
 * @param {string} bucket - Uno de BUCKETS.
 * @param {string} folder - Carpeta dentro del bucket (ej. el ID del proyecto).
 * @param {Blob} file - Archivo (o imagen ya comprimida).
 * @returns {Promise<{ path: string, publicUrl: string|null }>}
 */
async function uploadWithPermission(bucket, folder, file) {
  // 1) Permiso del backend (si el tipo no es válido, aquí llega el error en español)
  const permission = await apiRequest('/api/uploads', {
    method: 'POST',
    body: { bucket, folder, contentType: file.type },
  });

  // 2) Subida directa a Storage con ese permiso
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(permission.path, permission.token, file, {
    contentType: file.type,
    cacheControl: '31536000', // el nombre nunca se repite, así que se puede guardar en caché un año
  });
  if (error) {
    throw new AppError('No se pudo subir el archivo. Revisa que no supere el tamaño permitido.');
  }
  return { path: permission.path, publicUrl: permission.publicUrl };
}

/**
 * Sube un archivo y devuelve su RUTA dentro del bucket (para project-media).
 * @returns {Promise<string>} Ruta del archivo, ej. "GTH-1/<uuid>.jpg".
 */
export async function uploadFile(bucket, folder, file) {
  const { path } = await uploadWithPermission(bucket, folder, file);
  return path;
}

/**
 * Sube un archivo a un bucket PÚBLICO y devuelve su URL pública (para site-assets).
 * @returns {Promise<string>} URL pública del archivo.
 */
export async function uploadPublicFile(bucket, folder, file) {
  const { publicUrl } = await uploadWithPermission(bucket, folder, file);
  return publicUrl;
}
