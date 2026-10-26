/* ==========================================================================
   PROCESAMIENTO DE IMÁGENES Y VIDEOS SUBIDOS
   --------------------------------------------------------------------------
   LocalStorage solo guarda texto y tiene un límite de ~5 MB por web.
   Por eso:
     - Las IMÁGENES se reducen (máx. 1280 px) y se comprimen a JPEG con un
       <canvas> antes de convertirlas a texto base64.
     - Los VIDEOS no se pueden comprimir en el navegador, así que solo se
       aceptan si pesan 2 MB o menos.
   ========================================================================== */

import { AppError } from '../services/errors.js';

/* Límites configurables */
export const MAX_FILES_PER_PROJECT = 8;
const MAX_IMAGE_SIDE = 1280; // píxeles del lado más largo
const IMAGE_QUALITY = 0.75; // calidad JPEG (0 a 1)
const MAX_VIDEO_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_IMAGE_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB antes de comprimir

/* Tipos aceptados por el input de archivos */
export const ACCEPTED_MEDIA = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm';

/** Lee un archivo y lo devuelve como texto base64 (data URL) */
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new AppError(`No se pudo leer el archivo "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

/** Carga un data URL en un objeto Image para poder dibujarlo */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new AppError('La imagen está dañada o no es compatible.'));
    image.src = dataUrl;
  });
}

/**
 * Reduce y comprime una imagen usando un canvas.
 * @returns {Promise<string>} data URL en JPEG
 */
async function compressImage(file) {
  const originalDataUrl = await readAsDataUrl(file);
  const image = await loadImage(originalDataUrl);

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

  return canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
}

/**
 * Convierte un archivo subido en un objeto { type, src, name } listo para guardar.
 * Lanza AppError con un mensaje claro si el archivo no es válido.
 */
export async function processMediaFile(file) {
  if (file.type.startsWith('image/')) {
    if (file.size > MAX_IMAGE_INPUT_BYTES) {
      throw new AppError(`La imagen "${file.name}" pesa más de 15 MB.`);
    }
    return { type: 'image', src: await compressImage(file), name: file.name };
  }

  if (file.type.startsWith('video/')) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new AppError(`El video "${file.name}" pesa más de 2 MB. Súbelo más corto o comprimido.`);
    }
    return { type: 'video', src: await readAsDataUrl(file), name: file.name };
  }

  throw new AppError(`"${file.name}" no es una imagen ni un video compatible.`);
}

/** Convierte solo una imagen (por ejemplo la foto de "Quién está detrás") */
export async function processImageFile(file) {
  if (!file.type.startsWith('image/')) {
    throw new AppError('Selecciona un archivo de imagen.');
  }
  return compressImage(file);
}
