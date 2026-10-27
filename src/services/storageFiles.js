/* ==========================================================================
   ARCHIVOS EN SUPABASE STORAGE
   --------------------------------------------------------------------------
   Sube y borra archivos de los buckets públicos:
     - "project-media": imágenes y videos de los proyectos.
     - "site-assets":   foto de "Quién está detrás".
   Cada archivo se guarda con un nombre único (UUID) y en las tablas se
   guarda SOLO su URL pública.
   ========================================================================== */

import { supabase } from '../lib/supabaseClient.js';
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

/** Crea un nombre imposible de adivinar para el archivo */
function createFileName() {
  // crypto.randomUUID existe en navegadores modernos (https o localhost)
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Sube un archivo y devuelve su URL pública.
 * @param {string} bucket - Uno de BUCKETS.
 * @param {string} folder - Carpeta dentro del bucket (ej. el ID del proyecto).
 * @param {Blob} file - Archivo (o imagen ya comprimida).
 * @returns {Promise<string>} URL pública del archivo.
 */
export async function uploadPublicFile(bucket, folder, file) {
  const extension = EXTENSIONS[file.type] || 'bin';
  const path = `${folder}/${createFileName()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000', // el nombre nunca se repite, así que se puede guardar en caché un año
    upsert: false,
  });
  if (error) {
    throw toAppError(error, 'No se pudo subir el archivo. Revisa que no supere el tamaño permitido.');
  }

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
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
  const paths = urls.map((url) => getPathFromPublicUrl(bucket, url)).filter(Boolean);
  if (paths.length === 0) return;

  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    console.warn('No se pudieron borrar algunos archivos de Storage:', error.message);
  }
}
