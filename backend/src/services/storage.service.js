/* ==========================================================================
   SERVICIO DE ARCHIVOS (Supabase Storage)
   --------------------------------------------------------------------------
   Dos buckets:
     - "project-media" (PRIVADO): imágenes y videos de los proyectos. En la
       tabla project_media se guarda solo la RUTA ("GTH-1/<uuid>.jpg"). Para
       mostrarlos, el backend crea URLs FIRMADAS que vencen en 1 hora.
     - "site-assets" (PÚBLICO): portadas del portafolio y foto de "Quién está
       detrás". En la tabla se guarda su URL pública.

   ¿Por qué el navegador sube los archivos y no el backend?
   Un video puede pesar 50 MB: pasarlo por el Worker gastaría tiempo y
   memoria del servidor para nada. Por eso el backend solo da PERMISO (una URL firmada de
   subida, válida para un único archivo y una única ruta) y el navegador
   sube directo a Storage. Borrar y firmar URLs de lectura lo hace siempre
   el backend.
   ========================================================================== */

import { randomUUID } from 'node:crypto';
import { supabase } from '../database/supabase.js';
import { env } from '../config/env.js';
import { check } from '../utils/dbErrors.js';

/* Nombres de los buckets (deben coincidir con los de Supabase) */
export const BUCKETS = {
  PROJECT_MEDIA: 'project-media',
  SITE_ASSETS: 'site-assets',
};

/* Extensión del archivo según su tipo */
export const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

/* Segundos que dura una URL firmada de lectura de project-media */
const SIGNED_URL_SECONDS = 60 * 60; // 1 hora

/**
 * Crea una ruta nueva e imposible de adivinar y un permiso para subir a ella.
 * @param {string} bucket - Uno de BUCKETS.
 * @param {string} folder - Carpeta dentro del bucket (ej. "portfolio" o el ID del proyecto).
 * @param {string} contentType - Tipo del archivo (ej. "image/jpeg").
 * @returns {Promise<{ path: string, token: string, publicUrl: string|null }>}
 */
export async function createUploadUrl(bucket, folder, contentType) {
  const path = `${folder}/${randomUUID()}.${EXTENSIONS[contentType]}`;
  const data = check(
    await supabase.storage.from(bucket).createSignedUploadUrl(path),
    'No se pudo preparar la subida del archivo.'
  );

  // Solo los archivos del bucket público tienen URL pública
  const publicUrl = bucket === BUCKETS.SITE_ASSETS ? getPublicUrl(bucket, path) : null;
  return { path: data.path, token: data.token, publicUrl };
}

/** URL pública de un archivo de un bucket público */
export function getPublicUrl(bucket, path) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Pide URLs firmadas (vencen en 1 hora) para varios archivos privados,
 * en UNA sola petición.
 * @returns {Promise<Map<string, string>>} ruta -> URL firmada.
 */
export async function getSignedUrls(bucket, paths) {
  const urlsByPath = new Map();
  if (paths.length === 0) return urlsByPath;

  const data = check(
    await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_SECONDS),
    'No se pudieron cargar las imágenes y videos.'
  );
  data.forEach((item) => {
    if (item.signedUrl) urlsByPath.set(item.path, item.signedUrl);
  });
  return urlsByPath;
}

/**
 * Borra archivos a partir de sus rutas.
 * Si falla, NO detiene la acción principal (el dato ya se guardó): solo queda
 * un archivo huérfano en Storage, que no se ve en la web. Por eso no lanza error.
 */
export async function removeFiles(bucket, paths) {
  const cleanPaths = paths.filter(Boolean);
  if (cleanPaths.length === 0) return;

  const { error } = await supabase.storage.from(bucket).remove(cleanPaths);
  if (error) console.warn('No se pudieron borrar algunos archivos de Storage:', error.message);
}

/**
 * Saca la ruta interna a partir de la URL pública.
 * ".../storage/v1/object/public/site-assets/portfolio/abc.jpg" -> "portfolio/abc.jpg"
 * @returns {string|null} null si la URL no es de ese bucket.
 */
export function getPathFromPublicUrl(bucket, url) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = String(url || '').indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

/** Borra archivos a partir de sus URLs públicas (tampoco lanza error) */
export async function removePublicFiles(bucket, urls) {
  await removeFiles(
    bucket,
    urls.map((url) => getPathFromPublicUrl(bucket, url))
  );
}

/**
 * ¿La ruta tiene la forma que crea createUploadUrl dentro de esa carpeta?
 * "GTH-1/0b8f...-....jpg" -> true para la carpeta "GTH-1".
 * Sirve para que nadie pueda guardar (ni borrar) rutas de otras carpetas.
 */
export function isPathInFolder(path, folder) {
  const extensions = Object.values(EXTENSIONS).join('|');
  const pattern = new RegExp(`^[0-9a-f-]{36}\\.(${extensions})$`);
  const prefix = `${folder}/`;
  return String(path).startsWith(prefix) && pattern.test(String(path).slice(prefix.length));
}

/**
 * ¿La URL es un archivo NUESTRO del bucket público, dentro de esa carpeta?
 * Se compara con la URL que nosotros mismos generaríamos, así se rechaza
 * cualquier URL de otro sitio.
 */
export function isOwnPublicUrl(bucket, folder, url) {
  if (!String(url || '').startsWith(env.supabaseUrl)) return false;
  const path = getPathFromPublicUrl(bucket, url);
  return Boolean(path) && isPathInFolder(path, folder) && getPublicUrl(bucket, path) === url;
}
