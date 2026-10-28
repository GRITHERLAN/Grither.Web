/* ==========================================================================
   SERVICIO DE PORTAFOLIO (CRUD con Supabase)
   --------------------------------------------------------------------------
   Trabajos que se muestran en la página pública /portafolio y que el
   Administrador gestiona en Administrador > Portafolio.
   Igual que en projectService, toda escritura se VUELVE a validar aquí
   ("BackEnd") aunque el formulario ya lo haya hecho. Además la base de datos
   tiene sus propias reglas:
     - Título: índice UNIQUE (sin importar mayúsculas).
     - CHECK de largo en cada campo y enlace que empiece por https, mailto o tel.
     - RLS: todos leen; solo el Administrador crea, edita o borra.

   La imagen de portada se sube al bucket PÚBLICO "site-assets" (carpeta
   "portfolio/") y en la tabla se guarda solo su URL pública.
   ========================================================================== */

import { supabase } from '../lib/supabaseClient.js';
import { AppError, ValidationError } from './errors.js';
import { toAppError } from './supabaseErrors.js';
import { BUCKETS, removePublicFiles, uploadPublicFile } from './storageFiles.js';
import { MAX_LENGTH, isTooLong, isValidUrl, normalizeText, tooLongMessage } from '../utils/validators.js';

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

/* Mensaje cuando el portafolio ya no existe */
const NOT_FOUND_MESSAGE = 'El portafolio ya no existe. Recarga la página.';

/* --------------------------------------------------------------------------
   Traducción entre la base de datos (snake_case) y la app (camelCase)
   -------------------------------------------------------------------------- */

/** Fila de la tabla -> objeto de la app */
function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    stack: row.stack || [],
    url: row.url,
    type: row.is_real ? PORTFOLIO_TYPES.REAL : PORTFOLIO_TYPES.DEMO,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

/** Datos del formulario -> columnas de la tabla (sin la imagen) */
function toRow(values) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category.trim(),
    stack: values.stack.map((item) => String(item).trim()),
    url: values.url.trim(),
    is_real: values.type === PORTFOLIO_TYPES.REAL,
  };
}

/* --------------------------------------------------------------------------
   Lectura
   -------------------------------------------------------------------------- */

/** Devuelve todos los portafolios, del más reciente al más antiguo */
export async function getPortfolio() {
  const { data, error } = await supabase
    .from('portfolio')
    .select('id, title, description, category, stack, url, is_real, image_url, created_at')
    .order('created_at', { ascending: false });
  if (error) throw toAppError(error, 'No se pudo cargar el portafolio.');

  return data.map(fromRow);
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
  const stack = Array.isArray(values.stack) ? values.stack : [];
  if (stack.length === 0) {
    errors.stack = 'Agrega al menos una tecnología.';
  } else if (stack.length > MAX_STACK_ITEMS) {
    errors.stack = `Máximo ${MAX_STACK_ITEMS} tecnologías.`;
  } else if (stack.some((item) => String(item).trim().length === 0)) {
    errors.stack = 'No dejes elementos vacíos.';
  } else if (stack.some((item) => isTooLong(item, MAX_LENGTH.CARD_ITEM))) {
    errors.stack = `Cada elemento puede tener máximo ${MAX_LENGTH.CARD_ITEM} caracteres.`;
  }

  // Tipo: real o de prueba
  if (!Object.values(PORTFOLIO_TYPES).includes(values.type)) {
    errors.type = 'Selecciona el tipo de proyecto.';
  }

  return errors;
}

/** Lanza ValidationError si hay errores (se usa antes de cada escritura) */
async function assertValid(values, currentId) {
  const existingItems = await getPortfolio();
  const errors = validatePortfolioItem(values, existingItems, currentId);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  return existingItems;
}

/* --------------------------------------------------------------------------
   Escritura (solo Administrador: lo exige la RLS)
   -------------------------------------------------------------------------- */

/**
 * Crea un portafolio.
 * @param {object} values - Datos del formulario.
 * @param {Blob|null} imageFile - Portada ya comprimida (opcional).
 * @returns {Promise<object>} portafolio creado
 */
export async function createPortfolioItem(values, imageFile = null) {
  await assertValid(values, null);

  // Primero se sube la imagen para tener su URL
  const imageUrl = imageFile ? await uploadPublicFile(BUCKETS.SITE_ASSETS, IMAGE_FOLDER, imageFile) : null;

  const { data, error } = await supabase
    .from('portfolio')
    .insert({ ...toRow(values), image_url: imageUrl })
    .select()
    .single();

  if (error) {
    // Si no se guardó, la imagen subida sobra: se borra
    if (imageUrl) await removePublicFiles(BUCKETS.SITE_ASSETS, [imageUrl]);
    throw toAppError(error, 'No se pudo crear el portafolio.');
  }
  return fromRow(data);
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
  const existingItems = await assertValid(values, id);
  const current = existingItems.find((item) => item.id === id);
  if (!current) throw new AppError(NOT_FOUND_MESSAGE);

  // Decidimos la URL final de la portada
  let imageUrl = current.imageUrl;
  if (image.file) {
    imageUrl = await uploadPublicFile(BUCKETS.SITE_ASSETS, IMAGE_FOLDER, image.file);
  } else if (image.remove) {
    imageUrl = null;
  }

  const { data, error } = await supabase
    .from('portfolio')
    .update({ ...toRow(values), image_url: imageUrl })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // Si no se guardó, la imagen nueva sobra: se borra
    if (image.file) await removePublicFiles(BUCKETS.SITE_ASSETS, [imageUrl]);
    throw toAppError(error, 'No se pudo guardar el portafolio.');
  }

  // La portada anterior ya no se usa: se borra de Storage
  if (current.imageUrl && current.imageUrl !== imageUrl) {
    await removePublicFiles(BUCKETS.SITE_ASSETS, [current.imageUrl]);
  }
  return fromRow(data);
}

/**
 * Borra un portafolio y su portada.
 * @param {object} item - Portafolio a borrar (necesitamos su id e imageUrl).
 */
export async function deletePortfolioItem(item) {
  const { data, error } = await supabase.from('portfolio').delete().eq('id', item.id).select('id');
  if (error) throw toAppError(error, 'No se pudo borrar el portafolio.');
  if (data.length === 0) throw new AppError(NOT_FOUND_MESSAGE);

  if (item.imageUrl) await removePublicFiles(BUCKETS.SITE_ASSETS, [item.imageUrl]);
}
