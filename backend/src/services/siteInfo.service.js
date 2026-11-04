/* ==========================================================================
   SERVICIO DE INFORMACIÓN DEL SITIO (Contacto y Sobre mí)
   --------------------------------------------------------------------------
   Reemplaza a las funciones SQL save_contact_info y save_about_info.

   Los indicadores ("+50 proyectos", etc.) se guardan en un orden seguro,
   porque desde JavaScript no hay transacción:
     1) se insertan los indicadores NUEVOS,
     2) después se borran los VIEJOS (por su id).
   Si algo falla a la mitad quedan indicadores de más, nunca de menos.
   ========================================================================== */

import { supabase } from '../database/supabase.js';
import { HttpError, throwIfInvalid } from '../utils/HttpError.js';
import { check } from '../utils/dbErrors.js';
import { MAX_LENGTH, cleanText, isTooLong, isValidEmail, isValidPhone, isValidUrl, tooLongMessage } from '../utils/validators.js';
import { INDICATOR_SECTIONS, toAboutInfo, toAboutRow, toContactInfo, toContactRow } from '../models/siteInfo.model.js';
import { BUCKETS, isOwnPublicUrl, removePublicFiles } from './storage.service.js';

const PHASE_KEYS = ['reunion', 'bocetos', 'desarrollo', 'despliegue'];
const OWNER_PHOTO_FOLDER = 'owner';

/* --------------------------------------------------------------------------
   Indicadores (compartido entre Contacto y Sobre mí)
   -------------------------------------------------------------------------- */

/** Lee los indicadores de una sección, en su orden */
async function getIndicators(section) {
  return check(
    await supabase.from('indicators').select('value, label').eq('section', section).order('position'),
    'No se pudieron cargar los indicadores.'
  );
}

/** Devuelve un mensaje de error o '' si la lista de indicadores está bien */
function validateIndicators(indicators) {
  if (!Array.isArray(indicators) || indicators.length === 0) return 'Agrega al menos un indicador.';
  if (indicators.some((item) => !cleanText(item?.value) || !cleanText(item?.label))) {
    return 'Completa el valor y la descripción de cada indicador.';
  }
  const hasTooLong = indicators.some(
    (item) => isTooLong(item.value, MAX_LENGTH.INDICATOR_VALUE) || isTooLong(item.label, MAX_LENGTH.INDICATOR_LABEL)
  );
  return hasTooLong
    ? `Cada valor puede tener máximo ${MAX_LENGTH.INDICATOR_VALUE} caracteres y cada descripción ${MAX_LENGTH.INDICATOR_LABEL}.`
    : '';
}

/** Quita espacios extra de cada indicador */
function cleanIndicators(indicators) {
  return indicators.map((item) => ({ value: cleanText(item.value), label: cleanText(item.label) }));
}

/** Reemplaza los indicadores de una sección: primero inserta los nuevos, luego borra los viejos */
async function replaceIndicators(section, indicators) {
  const fallback = 'No se pudieron guardar los indicadores.';
  const oldRows = check(await supabase.from('indicators').select('id').eq('section', section), fallback);

  const newRows = indicators.map((item, index) => ({ section, value: item.value, label: item.label, position: index }));
  check(await supabase.from('indicators').insert(newRows), fallback);

  if (oldRows.length > 0) {
    check(await supabase.from('indicators').delete().in('id', oldRows.map((row) => row.id)), fallback);
  }
}

/** Revisa un texto con mínimo y máximo y deja el error en errors[key] */
function validateLength(value, min, max, key, minMessage, errors) {
  if (cleanText(value).length < min) errors[key] = minMessage;
  else if (isTooLong(value, max)) errors[key] = tooLongMessage(max);
}

/* --------------------------------------------------------------------------
   Contacto
   -------------------------------------------------------------------------- */

export async function getContactInfo() {
  // Se piden la fila de contacto y sus indicadores al mismo tiempo
  const [contactResult, indicators] = await Promise.all([
    supabase.from('contact_info').select('*').eq('id', 1).maybeSingle(),
    getIndicators(INDICATOR_SECTIONS.CONTACT),
  ]);
  const row = check(contactResult, 'No se pudo cargar la información de contacto.');
  return toContactInfo(row, indicators);
}

/** Enlace válido (http, https, mailto o tel) y no más largo de lo permitido */
function isValidLink(value) {
  return isValidUrl(value) && !isTooLong(value, MAX_LENGTH.URL);
}

function validateContactInfo(data) {
  const errors = {};
  if (!isValidEmail(data.email) || isTooLong(data.email, MAX_LENGTH.EMAIL)) errors.email = 'Escribe un correo válido.';
  if (!isValidPhone(data.phone)) errors.phone = 'Escribe un teléfono válido (ej. +57 300 000 0000).';
  // Ciudad: domicilio del Responsable que exige la Política de privacidad (art. 13 Decreto 1377)
  validateLength(data.city, 3, MAX_LENGTH.CITY, 'city', 'Escribe la ciudad (ej. Dosquebradas, Risaralda, Colombia).', errors);
  validateLength(data.brandDescription, 20, MAX_LENGTH.BRAND_DESCRIPTION, 'brandDescription', 'La descripción debe tener mínimo 20 caracteres.', errors);

  // Enlaces: solo http, https, mailto o tel (nunca javascript:) y con largo máximo
  if (!isValidLink(data.instagram)) errors.instagram = 'Escribe el enlace completo de Instagram.';
  if (!isValidLink(data.linkedin)) errors.linkedin = 'Escribe el enlace completo de LinkedIn.';
  if (!isValidLink(data.portfolio)) errors.portfolio = 'Escribe el enlace completo del portafolio.';

  const indicatorsError = validateIndicators(data.indicators);
  if (indicatorsError) errors.indicators = indicatorsError;
  return errors;
}

/** Valida y guarda contacto + indicadores */
export async function saveContactInfo(data) {
  throwIfInvalid(validateContactInfo(data));

  const clean = {
    email: cleanText(data.email),
    phone: cleanText(data.phone),
    city: cleanText(data.city),
    brandDescription: cleanText(data.brandDescription),
    instagram: cleanText(data.instagram),
    linkedin: cleanText(data.linkedin),
    portfolio: cleanText(data.portfolio),
  };

  check(await supabase.from('contact_info').upsert(toContactRow(clean)), 'No se pudo guardar la información de contacto.');
  await replaceIndicators(INDICATOR_SECTIONS.CONTACT, cleanIndicators(data.indicators));
  return getContactInfo();
}

/* --------------------------------------------------------------------------
   Sobre mí
   -------------------------------------------------------------------------- */

export async function getAboutInfo() {
  const [aboutResult, indicators] = await Promise.all([
    supabase.from('about_info').select('*').eq('id', 1).maybeSingle(),
    getIndicators(INDICATOR_SECTIONS.ABOUT),
  ]);
  const row = check(aboutResult, 'No se pudo cargar la información de Sobre mí.');
  return toAboutInfo(row, indicators);
}

function validateAboutInfo(data) {
  const errors = {};
  const owner = data.owner || {};
  const phases = data.phases || {};

  validateLength(data.brandDescription, 20, MAX_LENGTH.BRAND_DESCRIPTION, 'brandDescription', 'La descripción debe tener mínimo 20 caracteres.', errors);
  validateLength(owner.name, 3, MAX_LENGTH.PERSON_NAME, 'ownerName', 'Escribe el nombre.', errors);
  validateLength(owner.role, 3, MAX_LENGTH.OWNER_ROLE, 'ownerRole', 'Escribe el cargo.', errors);
  validateLength(owner.bio, 20, MAX_LENGTH.OWNER_BIO, 'ownerBio', 'La biografía debe tener mínimo 20 caracteres.', errors);

  // Cada una de las 4 fases debe tener su explicación
  PHASE_KEYS.forEach((key) => {
    validateLength(phases[key], 10, MAX_LENGTH.PHASE_TEXT, `phase_${key}`, 'Explica esta fase (mínimo 10 caracteres).', errors);
  });

  const indicatorsError = validateIndicators(data.indicators);
  if (indicatorsError) errors.indicators = indicatorsError;
  return errors;
}

/**
 * Guarda "Sobre mí". La foto llega como URL:
 *   - la misma de antes  -> se conserva,
 *   - una URL nueva      -> la subió el navegador con un permiso de /api/uploads,
 *   - vacía ('')         -> se quitó la foto.
 * Si la foto cambió, el archivo viejo se borra de Storage.
 */
export async function saveAboutInfo(data) {
  const current = check(
    await supabase.from('about_info').select('owner_photo_url').eq('id', 1).maybeSingle(),
    'No se pudo leer la información de Sobre mí.'
  );
  const previousPhoto = current?.owner_photo_url || '';
  const photo = cleanText(data.owner?.photo);
  const isNewPhoto = photo !== '' && photo !== previousPhoto;
  const isOwnPhoto = isOwnPublicUrl(BUCKETS.SITE_ASSETS, OWNER_PHOTO_FOLDER, photo);

  try {
    throwIfInvalid(validateAboutInfo(data));

    // Solo se acepta conservar la foto actual o una subida a la carpeta "owner" de NUESTRO Storage
    if (isNewPhoto && !isOwnPhoto) throw new HttpError(400, 'La foto no es válida. Vuelve a elegirla.');

    const clean = {
      brandDescription: cleanText(data.brandDescription),
      owner: { name: cleanText(data.owner.name), role: cleanText(data.owner.role), bio: cleanText(data.owner.bio), photo },
      phases: Object.fromEntries(PHASE_KEYS.map((key) => [key, cleanText(data.phases[key])])),
    };
    check(await supabase.from('about_info').upsert(toAboutRow(clean)), 'No se pudo guardar la información de Sobre mí.');
  } catch (error) {
    // No se guardó: la foto que el navegador acaba de subir sobra y se borra
    if (isNewPhoto && isOwnPhoto) await removePublicFiles(BUCKETS.SITE_ASSETS, [photo]);
    throw error;
  }
  await replaceIndicators(INDICATOR_SECTIONS.ABOUT, cleanIndicators(data.indicators));

  // Ya guardado: si la foto anterior ya no se usa, se borra de Storage
  if (previousPhoto && previousPhoto !== photo) await removePublicFiles(BUCKETS.SITE_ASSETS, [previousPhoto]);
  return getAboutInfo();
}
