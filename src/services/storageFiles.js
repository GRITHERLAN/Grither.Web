/* ==========================================================================
   ARCHIVOS EN SUPABASE STORAGE
   --------------------------------------------------------------------------
   Dos buckets:
     - "project-media" (PRIVADO): imágenes y videos de los proyectos. En la
       tabla project_media se guarda solo la RUTA ("GTH-1/<uuid>.jpg"). Para
       mostrarlos se piden URLs FIRMADAS que vencen en 1 hora, y Storage
       solo las entrega al admin o al cliente dueño del proyecto.
     - "site-assets" (público): foto de "Quién está detrás". En la tabla se
       guarda su URL pública, porque se muestra en la página pública.
   Cada archivo se guarda con un nombre único (UUID).
   ========================================================================== */

import { supabase } from '../lib/supabaseClient.js';
import { AppError } from './errors.js';
import { toAppError } from './supabaseErrors.js';

/* Nombres de los buckets (deben coincidir con la migración SQL) */
export const BUCKETS = {
  PROJECT_MEDIA: 'project-media',
  SITE_ASSETS: 'site-assets',
};

/* Extensión del archivo según su tipo */
const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

/* Segundos que dura una URL firmada de project-media */
const SIGNED_URL_SECONDS = 60 * 60; // 1 hora

/**
 * Crea un nombre imposible de adivinar para el archivo (UUID).
 * La base de datos exige este formato en project_media.path.
 * crypto.randomUUID existe en todos los navegadores modernos con https o localhost.
 */
function createFileName() {
  return window.crypto.randomUUID();
}

/**
 * Sube un archivo y devuelve su RUTA dentro del bucket.
 * @param {string} bucket - Uno de BUCKETS.
 * @param {string} folder - Carpeta dentro del bucket (ej. el ID del proyecto).
 * @param {Blob} file - Archivo (o imagen ya comprimida).
 * @returns {Promise<string>} Ruta del archivo, ej. "GTH-1/<uuid>.jpg".
 */
export async function uploadFile(bucket, folder, file) {
  const extension = EXTENSIONS[file.type];
  if (!extension) {
    throw new AppError('Tipo de archivo no permitido. Usa PNG, JPG, WEBP, GIF, MP4 o WEBM.');
  }
  const path = `${folder}/${createFileName()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000', // el nombre nunca se repite, así que se puede guardar en caché un año
    upsert: false,
  });
  if (error) {
    throw toAppError(error, 'No se pudo subir el archivo. Revisa que no supere el tamaño permitido.');
  }
  return path;
}

/**
 * Sube un archivo a un bucket PÚBLICO y devuelve su URL pública
 * (solo para site-assets: la foto de "Quién está detrás").
 * @returns {Promise<string>} URL pública del archivo.
 */
export async function uploadPublicFile(bucket, folder, file) {
  const path = await uploadFile(bucket, folder, file);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Pide URLs firmadas (vencen en 1 hora) para varios archivos de un bucket
 * privado, en UNA sola petición.
 * Storage solo firma los archivos que quien tiene la sesión puede ver
 * (admin: todos; cliente: los de sus proyectos).
 * @param {string} bucket - Uno de BUCKETS.
 * @param {string[]} paths - Rutas de los archivos.
 * @returns {Promise<Map<string, string>>} ruta -> URL firmada.
 */
export async function getSignedUrls(bucket, paths) {
  const urlsByPath = new Map();
  if (paths.length === 0) return urlsByPath;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw toAppError(error, 'No se pudieron cargar las imágenes y videos.');

  data.forEach((item) => {
    if (item.signedUrl) urlsByPath.set(item.path, item.signedUrl);
  });
  return urlsByPath;
}

/**
 * Borra archivos a partir de sus rutas dentro del bucket.
 * Si falla, NO detiene la acción principal (el dato ya se guardó): solo queda
 * un archivo huérfano en Storage, que no se ve en la web.
 * @param {string} bucket - Uno de BUCKETS.
 * @param {string[]} paths - Rutas a borrar.
 */
export async function removeFiles(bucket, paths) {
  const cleanPaths = paths.filter(Boolean);
  if (cleanPaths.length === 0) return;

  const { error } = await supabase.storage.from(bucket).remove(cleanPaths);
  if (error) {
    console.warn('No se pudieron borrar algunos archivos de Storage:', error.message);
  }
}

/**
 * Saca la ruta interna del archivo a partir de su URL pública.
 * "https://.../storage/v1/object/public/project-media/GTH-1/abc.jpg" -> "GTH-1/abc.jpg"
 * @returns {string|null} null si la URL no es de ese bucket.
 */
export function getPathFromPublicUrl(bucket, url) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = String(url || '').indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

/**
 * Borra archivos a partir de sus URLs públicas.
 * Si falla, NO detiene la acción principal (el dato ya se guardó): solo queda
 * un archivo huérfano en Storage, que no se ve en la web.
 * @param {string} bucket - Uno de BUCKETS.
 * @param {string[]} urls - URLs públicas a borrar.
 */
export async function removePublicFiles(bucket, urls) {
  await removeFiles(
    bucket,
    urls.map((url) => getPathFromPublicUrl(bucket, url))
  );
}
