/* ==========================================================================
   SERVICIO DE PORTAFOLIO (CRUD con la API)
   --------------------------------------------------------------------------
   Trabajos que se muestran en la página pública /portafolio y que el
   Administrador gestiona en Administrador > Portafolio.
   Fuente de datos: la API del backend (/api/portfolio). El backend vuelve
   a validar todo (incluido que el título no se repita) y solo deja escribir
   al Administrador. Aquí se valida antes para mostrar los errores al instante.

   La imagen de portada se sube al bucket PÚBLICO "site-assets" (carpeta
   "portfolio/") con un permiso del backend, y a la API se manda su URL.
   ========================================================================== */

import { apiRequest } from './apiClient.js';
import { BUCKETS, uploadPublicFile } from './storageFiles.js';
import {
  MAX_LENGTH,
  isTooLong,
  isValidUrl,
  normalizeText,
  tooLongMessage,
  validateStringList,
} from '../utils/validators.js';

/* --------------------------------------------------------------------------
   Constantes del dominio
   -------------------------------------------------------------------------- */

/* Carpeta de las portadas dentro del bucket site-assets */
const IMAGE_FOLDER = 'portfolio';

/* Límites del stack (lista de tecnologías / etiquetas) */
export const MAX_STACK_ITEMS = 8;

/* Tipo de proyecto: real (de un cliente) o de prueba (demostración) */
export const PORTFOLIO_TYPES = {
  REAL: 'real',
  DEMO: 'prueba',
};

/* Texto visible de cada tipo */
export const PORTFOLIO_TYPE_LABELS = {
  [PORTFOLIO_TYPES.REAL]: 'Proyecto real',
  [PORTFOLIO_TYPES.DEMO]: 'Proyecto de prueba',
};

/* Opciones del desplegable "Tipo de proyecto" del formulario */
export const PORTFOLIO_TYPE_OPTIONS = [
  { value: PORTFOLIO_TYPES.REAL, label: PORTFOLIO_TYPE_LABELS[PORTFOLIO_TYPES.REAL] },
  { value: PORTFOLIO_TYPES.DEMO, label: PORTFOLIO_TYPE_LABELS[PORTFOLIO_TYPES.DEMO] },
];

/* La traducción fila de la BD <-> objeto de la app ahora vive en el backend
   (backend/src/models/portfolio.model.js): la API ya devuelve el objeto listo. */

/* --------------------------------------------------------------------------
   Lectura
   -------------------------------------------------------------------------- */

/** Devuelve todos los portafolios, del más reciente al más antiguo */
export async function getPortfolio() {
  return apiRequest('/api/portfolio');
}

/* --------------------------------------------------------------------------
   Validación (la usan el formulario y este mismo servicio)
   -------------------------------------------------------------------------- */

/**
 * Valida los datos de un portafolio.
 * @param {object} values - { title, description, category, stack, url, type }
 * @param {object[]} existingItems - Portafolios ya guardados (para revisar títulos repetidos).
 * @param {string|null} currentId - ID del que se edita (para no compararse consigo mismo).
 * @returns {object} errores por campo (vacío = todo bien)
 */
export function validatePortfolioItem(values, existingItems = [], currentId = null) {
  const errors = {};

  // Título: 3 a 80 caracteres y sin repetirse
  const title = String(values.title || '').trim();
  if (title.length < 3) {
    errors.title = 'El título debe tener mínimo 3 caracteres.';
  } else if (isTooLong(title, MAX_LENGTH.PORTFOLIO_TITLE)) {
    errors.title = tooLongMessage(MAX_LENGTH.PORTFOLIO_TITLE);
  } else {
    const repeated = existingItems.some(
      (item) => item.id !== currentId && normalizeText(item.title) === normalizeText(title)
    );
    if (repeated) errors.title = 'Ya existe un portafolio con este título.';
  }

  // Categoría: 2 a 40 caracteres
  const category = String(values.category || '').trim();
  if (category.length < 2) {
    errors.category = 'Escribe la categoría (mínimo 2 caracteres).';
  } else if (isTooLong(category, MAX_LENGTH.PORTFOLIO_CATEGORY)) {
    errors.category = tooLongMessage(MAX_LENGTH.PORTFOLIO_CATEGORY);
  }

  // Descripción: 10 a 300 caracteres
  const description = String(values.description || '').trim();
  if (description.length < 10) {
    errors.description = 'La descripción debe tener mínimo 10 caracteres.';
  } else if (isTooLong(description, MAX_LENGTH.PORTFOLIO_DESCRIPTION)) {
    errors.description = tooLongMessage(MAX_LENGTH.PORTFOLIO_DESCRIPTION);
  }

  // Enlace del botón "Ver web"
  if (!isValidUrl(values.url || '') || isTooLong(values.url, MAX_LENGTH.URL)) {
    errors.url = 'Escribe un enlace válido (https://...).';
  }

  // Stack: entre 1 y 8 elementos, ninguno vacío
  const stackError =
    Array.isArray(values.stack) && values.stack.length > MAX_STACK_ITEMS
      ? `Máximo ${MAX_STACK_ITEMS} tecnologías.`
      : validateStringList(values.stack, 'una tecnología');
  if (stackError) errors.stack = stackError;

  // Tipo: real o de prueba
  if (!Object.values(PORTFOLIO_TYPES).includes(values.type)) {
    errors.type = 'Selecciona el tipo de proyecto.';
  }

  return errors;
}

/* --------------------------------------------------------------------------
   Escritura (solo Administrador: lo revisa el backend)
   -------------------------------------------------------------------------- */

/**
 * Crea un portafolio.
 * @param {object} values - Datos del formulario.
 * @param {Blob|null} imageFile - Portada ya comprimida (opcional).
 * @returns {Promise<object>} portafolio creado
 */
export async function createPortfolioItem(values, imageFile = null) {
  // Primero se sube la imagen para tener su URL (si la API falla, el backend la borra)
  const imageUrl = imageFile ? await uploadPublicFile(BUCKETS.SITE_ASSETS, IMAGE_FOLDER, imageFile) : null;
  return apiRequest('/api/portfolio', { method: 'POST', body: { ...values, imageUrl } });
}

/**
 * Edita un portafolio.
 * @param {string} id - ID del portafolio.
 * @param {object} values - Datos del formulario.
 * @param {object} image - Qué hacer con la portada:
 *   { file: Blob|null, remove: boolean }
 *   - file: nueva portada (reemplaza la anterior).
 *   - remove: true para dejarlo sin imagen.
 * @returns {Promise<object>} portafolio actualizado
 */
export async function updatePortfolioItem(id, values, image = { file: null, remove: false }) {
  /* Se le dice al backend qué hacer con la portada:
     'replace' (una nueva), 'remove' (quitarla) o 'keep' (dejar la que tiene).
     El backend borra de Storage la portada que deje de usarse. */
  let imageAction = 'keep';
  let imageUrl = null;
  if (image.file) {
    imageAction = 'replace';
    imageUrl = await uploadPublicFile(BUCKETS.SITE_ASSETS, IMAGE_FOLDER, image.file);
  } else if (image.remove) {
    imageAction = 'remove';
  }

  return apiRequest(`/api/portfolio/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { ...values, imageAction, imageUrl },
  });
}

/**
 * Borra un portafolio y su portada.
 * @param {object} item - Portafolio a borrar (se usa su id).
 */
export async function deletePortfolioItem(item) {
  await apiRequest(`/api/portfolio/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
}
