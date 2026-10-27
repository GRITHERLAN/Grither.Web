/* ==========================================================================
   PROCESAMIENTO DE IMÁGENES Y VIDEOS SUBIDOS
   --------------------------------------------------------------------------
   Los archivos se guardan en Supabase Storage (ya no en LocalStorage), así
   que no hay límite de 5 MB del navegador. Aun así:
     - Las IMÁGENES se reducen (máx. 1280 px) y se comprimen a JPEG con un
       <canvas>: cargan más rápido para el cliente y ocupan menos espacio.
     - Los VIDEOS se suben tal cual, si pesan 50 MB o menos (el límite del
       bucket "project-media").
   Cada archivo procesado trae:
     - file: el archivo listo para subir (Blob).
     - src:  una vista previa local (URL "blob:") para mostrarlo antes de guardar.
   ========================================================================== */

import { AppError } from '../services/errors.js';

/* Límites configurables */
export const MAX_FILES_PER_PROJECT = 8;
const MAX_IMAGE_SIDE = 1280; // píxeles del lado más largo
const IMAGE_QUALITY = 0.75; // calidad JPEG (0 a 1)
const MAX_VIDEO_MB = 50; // igual al límite del bucket en Supabase
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
const MAX_IMAGE_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB antes de comprimir

/* Texto para mostrar el límite de video en el formulario */
export const MAX_VIDEO_LABEL = `${MAX_VIDEO_MB} MB`;

/* Tipos aceptados por el input de archivos */
export const ACCEPTED_MEDIA = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm';

/** Carga un archivo de imagen en un objeto Image para poder dibujarlo */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl); // ya no se necesita la URL temporal
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new AppError('La imagen está dañada o no es compatible.'));
    };
    image.src = objectUrl;
  });
}

/**
 * Reduce y comprime una imagen usando un canvas.
 * @returns {Promise<Blob>} imagen en JPEG
 */
async function compressImage(file) {
  const image = await loadImage(file);

  // Calculamos el nuevo tamaño manteniendo la proporción
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  // Dibujamos la imagen reducida en un canvas creado con createElement
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  // Fondo blanco para que las imágenes PNG transparentes no queden negras
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  // toBlob es asíncrono: lo envolvemos en una promesa
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new AppError('No se pudo procesar la imagen.'))),
      'image/jpeg',
      IMAGE_QUALITY
    );
  });
}

/**
 * Convierte un archivo subido en un objeto { type, src, name, file } listo
 * para mostrarse como vista previa y subirse al guardar.
 * Lanza AppError con un mensaje claro si el archivo no es válido.
 */
export async function processMediaFile(file) {
  if (file.type.startsWith('image/')) {
    if (file.size > MAX_IMAGE_INPUT_BYTES) {
      throw new AppError(`La imagen "${file.name}" pesa más de 15 MB.`);
    }
    const compressed = await compressImage(file);
    return { type: 'image', src: URL.createObjectURL(compressed), name: file.name, file: compressed };
  }

  if (file.type.startsWith('video/')) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new AppError(`El video "${file.name}" pesa más de ${MAX_VIDEO_LABEL}. Súbelo más corto o comprimido.`);
    }
    return { type: 'video', src: URL.createObjectURL(file), name: file.name, file };
  }

  throw new AppError(`"${file.name}" no es una imagen ni un video compatible.`);
}

/**
 * Procesa solo una imagen (por ejemplo la foto de "Quién está detrás").
 * @returns {Promise<{file: Blob, previewUrl: string}>}
 */
export async function processImageFile(file) {
  if (!file.type.startsWith('image/')) {
    throw new AppError('Selecciona un archivo de imagen.');
  }
  const compressed = await compressImage(file);
  return { file: compressed, previewUrl: URL.createObjectURL(compressed) };
}
