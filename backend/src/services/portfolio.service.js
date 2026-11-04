/* ==========================================================================
   SERVICIO DE PORTAFOLIO
   --------------------------------------------------------------------------
   Trabajos de la página pública /portafolio. Todos pueden leerlos; solo el
   Administrador crea, edita o borra (eso lo revisa requireAdmin en la ruta).
   La base de datos además tiene sus propias reglas: título único sin
   importar mayúsculas (portfolio_title_unique) y CHECK de largo en cada campo.

   La portada la sube el navegador a "site-assets/portfolio/" con un permiso
   de /api/uploads; aquí solo llega su URL pública y se revisa que sea nuestra.
   ========================================================================== */

import { supabase } from '../database/supabase.js';
import { HttpError, throwIfInvalid } from '../utils/HttpError.js';
import { check } from '../utils/dbErrors.js';
import { MAX_LENGTH, cleanStringList, cleanText, isTooLong, isValidUrl, normalizeText, tooLongMessage } from '../utils/validators.js';
import { PORTFOLIO_COLUMNS, PORTFOLIO_TYPES, toPortfolioItem, toPortfolioRow } from '../models/portfolio.model.js';
import { BUCKETS, isOwnPublicUrl, removePublicFiles } from './storage.service.js';

const IMAGE_FOLDER = 'portfolio';
const MAX_STACK_ITEMS = 8;
const NOT_FOUND_MESSAGE = 'El portafolio ya no existe. Recarga la página.';

/* Qué hacer con la portada al editar */
const IMAGE_ACTIONS = {
  KEEP: 'keep', // se conserva la que ya tiene
  REMOVE: 'remove', // queda sin imagen
  REPLACE: 'replace', // se cambia por una nueva (imageUrl)
};

/* --------------------------------------------------------------------------
   Lectura
   -------------------------------------------------------------------------- */

/** Todos los portafolios, del más reciente al más antiguo */
export async function getPortfolio() {
  const rows = check(
    await supabase.from('portfolio').select(PORTFOLIO_COLUMNS).order('created_at', { ascending: false }),
    'No se pudo cargar el portafolio.'
  );
  return rows.map(toPortfolioItem);
}

/** Un portafolio por id, o 404 */
async function getPortfolioItemOrFail(id) {
  const row = check(
    await supabase.from('portfolio').select(PORTFOLIO_COLUMNS).eq('id', id).maybeSingle(),
    'No se pudo cargar el portafolio.'
  );
  if (!row) throw new HttpError(404, NOT_FOUND_MESSAGE);
  return toPortfolioItem(row);
}

/* --------------------------------------------------------------------------
   Validación
   -------------------------------------------------------------------------- */

/** Revisa el título: largo y que no lo use otro portafolio */
async function validateTitle(title, currentId, errors) {
  if (title.length < 3) errors.title = 'El título debe tener mínimo 3 caracteres.';
  else if (isTooLong(title, MAX_LENGTH.PORTFOLIO_TITLE)) errors.title = tooLongMessage(MAX_LENGTH.PORTFOLIO_TITLE);
  if (errors.title) return;

  // Solo se piden id y título de los demás (nada de imágenes)
  const rows = check(await supabase.from('portfolio').select('id, title'), 'No se pudo revisar el portafolio.');
  const repeated = rows.some((row) => row.id !== currentId && normalizeText(row.title) === normalizeText(title));
  if (repeated) errors.title = 'Ya existe un portafolio con este título.';
}

/** Revisa la lista de tecnologías (stack): de 1 a 8, ninguna vacía ni muy larga */
function validateStack(stack) {
  if (!Array.isArray(stack) || stack.length === 0) return 'Agrega al menos una tecnología.';
  if (stack.length > MAX_STACK_ITEMS) return `Máximo ${MAX_STACK_ITEMS} tecnologías.`;
  if (stack.some((item) => cleanText(item).length === 0)) return 'No dejes elementos vacíos.';
  if (stack.some((item) => isTooLong(item, MAX_LENGTH.CARD_ITEM))) return `Cada elemento puede tener máximo ${MAX_LENGTH.CARD_ITEM} caracteres.`;
  return '';
}

/**
 * Valida todos los campos y devuelve los datos ya limpios.
 * @param {object} values - { title, description, category, stack, url, type }
 * @param {string|null} currentId - Portafolio que se edita (no se compara consigo mismo).
 */
async function validatePortfolioItem(values, currentId) {
  const errors = {};
  const clean = {
    title: cleanText(values.title),
    category: cleanText(values.category),
    description: cleanText(values.description),
    url: cleanText(values.url),
    stack: Array.isArray(values.stack) ? cleanStringList(values.stack) : values.stack,
    type: values.type,
  };

  await validateTitle(clean.title, currentId, errors);

  if (clean.category.length < 2) errors.category = 'Escribe la categoría (mínimo 2 caracteres).';
  else if (isTooLong(clean.category, MAX_LENGTH.PORTFOLIO_CATEGORY)) errors.category = tooLongMessage(MAX_LENGTH.PORTFOLIO_CATEGORY);

  if (clean.description.length < 10) errors.description = 'La descripción debe tener mínimo 10 caracteres.';
  else if (isTooLong(clean.description, MAX_LENGTH.PORTFOLIO_DESCRIPTION)) errors.description = tooLongMessage(MAX_LENGTH.PORTFOLIO_DESCRIPTION);

  if (!isValidUrl(clean.url) || isTooLong(clean.url, MAX_LENGTH.URL)) errors.url = 'Escribe un enlace válido (https://...).';

  const stackError = validateStack(values.stack);
  if (stackError) errors.stack = stackError;

  if (!Object.values(PORTFOLIO_TYPES).includes(clean.type)) errors.type = 'Selecciona el tipo de proyecto.';

  throwIfInvalid(errors);
  return clean;
}

/** Revisa que una portada nueva sea un archivo NUESTRO de la carpeta portfolio */
function assertOwnImage(imageUrl) {
  if (!isOwnPublicUrl(BUCKETS.SITE_ASSETS, IMAGE_FOLDER, imageUrl)) {
    throw new HttpError(400, 'La imagen de portada no es válida. Vuelve a elegirla.');
  }
}

/* --------------------------------------------------------------------------
   Escritura (solo Administrador)
   -------------------------------------------------------------------------- */

/**
 * Crea un portafolio.
 * @param {object} values - Datos del formulario + imageUrl (URL pública o null).
 */
export async function createPortfolioItem(values) {
  const imageUrl = values.imageUrl || null;
  try {
    if (imageUrl) assertOwnImage(imageUrl);
    const clean = await validatePortfolioItem(values, null);
    const row = check(
      await supabase.from('portfolio').insert(toPortfolioRow(clean, imageUrl)).select(PORTFOLIO_COLUMNS).single(),
      'No se pudo crear el portafolio.'
    );
    return toPortfolioItem(row);
  } catch (error) {
    // Si no se guardó, la imagen que ya subió el navegador sobra: se borra
    if (imageUrl && isOwnPublicUrl(BUCKETS.SITE_ASSETS, IMAGE_FOLDER, imageUrl)) {
      await removePublicFiles(BUCKETS.SITE_ASSETS, [imageUrl]);
    }
    throw error;
  }
}

/** Decide la URL final de la portada según imageAction (keep, remove o replace) */
function getFinalImageUrl(current, values) {
  if (values.imageAction === IMAGE_ACTIONS.REPLACE) {
    assertOwnImage(values.imageUrl);
    return values.imageUrl;
  }
  if (values.imageAction === IMAGE_ACTIONS.REMOVE) return null;
  return current.imageUrl; // keep (o si no se indicó nada)
}

/**
 * Edita un portafolio.
 * @param {object} values - Datos del formulario + imageAction + imageUrl.
 */
export async function updatePortfolioItem(id, values) {
  const current = await getPortfolioItemOrFail(id);
  const isReplacing = values.imageAction === IMAGE_ACTIONS.REPLACE;

  let row;
  try {
    const imageUrl = getFinalImageUrl(current, values);
    const clean = await validatePortfolioItem(values, id);
    row = check(
      await supabase.from('portfolio').update(toPortfolioRow(clean, imageUrl)).eq('id', id).select(PORTFOLIO_COLUMNS).single(),
      'No se pudo guardar el portafolio.'
    );
  } catch (error) {
    // No se guardó: la portada nueva sobra y se borra
    if (isReplacing && isOwnPublicUrl(BUCKETS.SITE_ASSETS, IMAGE_FOLDER, values.imageUrl)) {
      await removePublicFiles(BUCKETS.SITE_ASSETS, [values.imageUrl]);
    }
    throw error;
  }

  // La portada anterior ya no se usa: se borra de Storage
  if (current.imageUrl && current.imageUrl !== row.image_url) {
    await removePublicFiles(BUCKETS.SITE_ASSETS, [current.imageUrl]);
  }
  return toPortfolioItem(row);
}

/** Borra un portafolio y su portada */
export async function deletePortfolioItem(id) {
  const current = await getPortfolioItemOrFail(id);
  check(await supabase.from('portfolio').delete().eq('id', id), 'No se pudo borrar el portafolio.');
  if (current.imageUrl) await removePublicFiles(BUCKETS.SITE_ASSETS, [current.imageUrl]);
}
