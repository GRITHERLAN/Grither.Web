/* ==========================================================================
   SERVICIO DE INFORMACIÓN DEL SITIO
   --------------------------------------------------------------------------
   Lee y guarda la información editable solo por el Administrador:
     - Contacto  (correo, teléfono, redes, descripción, indicadores)
     - Nosotros  (descripción, indicadores, quién está detrás, fases)

   Fuente de datos: Supabase.
     Tablas contact_info, about_info e indicators.
     Para guardar se usan las funciones SQL save_contact_info y
     save_about_info, que guardan TODO el bloque en una sola transacción
     (y solo funcionan si quien llama es Administrador, por la RLS).
   La UI recibe los mismos objetos de antes (camelCase), así que no cambia.
   ========================================================================== */

import { supabase } from '../lib/supabaseClient.js';
import { ValidationError } from './errors.js';
import { toAppError } from './supabaseErrors.js';
import { BUCKETS, removePublicFiles, uploadPublicFile } from './storageFiles.js';
import { MAX_LENGTH, isTooLong, isValidEmail, isValidPhone, isValidUrl, tooLongMessage } from '../utils/validators.js';

/* --------------------------------------------------------------------------
   Indicadores (compartido entre Contacto y Nosotros)
   -------------------------------------------------------------------------- */

/**
 * Valida una lista de indicadores [{ value, label }].
 * Devuelve un mensaje de error o cadena vacía si todo está bien.
 */
function validateIndicators(indicators) {
  if (!Array.isArray(indicators) || indicators.length === 0) {
    return 'Agrega al menos un indicador.';
  }
  const hasEmpty = indicators.some((item) => !item.value.trim() || !item.label.trim());
  if (hasEmpty) return 'Completa el valor y la descripción de cada indicador.';

  const hasTooLong = indicators.some(
    (item) => isTooLong(item.value, MAX_LENGTH.INDICATOR_VALUE) || isTooLong(item.label, MAX_LENGTH.INDICATOR_LABEL)
  );
  return hasTooLong
    ? `Cada valor puede tener máximo ${MAX_LENGTH.INDICATOR_VALUE} caracteres y cada descripción ${MAX_LENGTH.INDICATOR_LABEL}.`
    : '';
}

/* Estructuras en blanco: solo se usan si la tabla está vacía, para que la web
   no se caiga y el admin pueda abrir el editor y llenar la información. */
const EMPTY_CONTACT_INFO = {
  email: '',
  phone: '',
  city: '',
  brandDescription: '',
  instagram: '',
  linkedin: '',
  portfolio: '',
  indicators: [],
};

const EMPTY_ABOUT_INFO = {
  brandDescription: '',
  indicators: [],
  owner: { name: '', role: '', bio: '', photo: '' },
  phases: { reunion: '', bocetos: '', desarrollo: '', despliegue: '' },
};

/** Quita espacios extra de cada indicador */
function cleanIndicators(indicators) {
  return indicators.map((item) => ({ value: item.value.trim(), label: item.label.trim() }));
}

/**
 * Lee los indicadores de una sección, en su orden.
 * @param {'contacto'|'nosotros'} section
 */
async function getIndicators(section) {
  const { data, error } = await supabase
    .from('indicators')
    .select('value, label')
    .eq('section', section)
    .order('position');
  if (error) throw toAppError(error, 'No se pudieron cargar los indicadores.');
  return data;
}

/* --------------------------------------------------------------------------
   Contacto
   -------------------------------------------------------------------------- */

export async function getContactInfo() {
  // Se piden la fila de contacto y sus indicadores al mismo tiempo
  const [contactResult, indicators] = await Promise.all([
    supabase.from('contact_info').select('*').eq('id', 1).maybeSingle(),
    getIndicators('contacto'),
  ]);
  if (contactResult.error) {
    throw toAppError(contactResult.error, 'No se pudo cargar la información de contacto.');
  }

  // Si la tabla está vacía, se devuelve la estructura en blanco
  const row = contactResult.data;
  if (!row) return { ...EMPTY_CONTACT_INFO, indicators };

  return {
    email: row.email,
    phone: row.phone,
    city: row.city ?? '',
    brandDescription: row.brand_description,
    instagram: row.instagram,
    linkedin: row.linkedin,
    portfolio: row.portfolio,
    indicators,
  };
}

export function validateContactInfo(data) {
  const errors = {};
  if (!isValidEmail(data.email) || isTooLong(data.email, MAX_LENGTH.EMAIL)) errors.email = 'Escribe un correo válido.';
  if (!isValidPhone(data.phone)) errors.phone = 'Escribe un teléfono válido (ej. +57 300 000 0000).';
  // Ciudad: domicilio del Responsable que exige la Política de privacidad (art. 13 Decreto 1377)
  if (String(data.city || '').trim().length < 3) errors.city = 'Escribe la ciudad (ej. Dosquebradas, Risaralda, Colombia).';
  else if (isTooLong(data.city, MAX_LENGTH.CITY)) errors.city = tooLongMessage(MAX_LENGTH.CITY);
  if (data.brandDescription.trim().length < 20) {
    errors.brandDescription = 'La descripción debe tener mínimo 20 caracteres.';
  } else if (isTooLong(data.brandDescription, MAX_LENGTH.BRAND_DESCRIPTION)) {
    errors.brandDescription = tooLongMessage(MAX_LENGTH.BRAND_DESCRIPTION);
  }
  // Enlaces: solo http, https, mailto o tel (nunca javascript:) y con largo máximo
  if (!isValidUrl(data.instagram) || isTooLong(data.instagram, MAX_LENGTH.URL)) errors.instagram = 'Escribe el enlace completo de Instagram.';
  if (!isValidUrl(data.linkedin) || isTooLong(data.linkedin, MAX_LENGTH.URL)) errors.linkedin = 'Escribe el enlace completo de LinkedIn.';
  if (!isValidUrl(data.portfolio) || isTooLong(data.portfolio, MAX_LENGTH.URL)) errors.portfolio = 'Escribe el enlace completo del portafolio.';

  const indicatorsError = validateIndicators(data.indicators);
  if (indicatorsError) errors.indicators = indicatorsError;

  return errors;
}

export async function saveContactInfo(data) {
  const errors = validateContactInfo(data);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  const cleanData = {
    email: data.email.trim(),
    phone: data.phone.trim(),
    city: data.city.trim(),
    brandDescription: data.brandDescription.trim(),
    instagram: data.instagram.trim(),
    linkedin: data.linkedin.trim(),
    portfolio: data.portfolio.trim(),
    indicators: cleanIndicators(data.indicators),
  };

  // Se guarda contacto + indicadores en una sola transacción
  const { error } = await supabase.rpc('save_contact_info', { payload: cleanData });
  if (error) throw toAppError(error, 'No se pudo guardar la información de contacto.');
  return cleanData;
}

/* --------------------------------------------------------------------------
   Sobre mí
   -------------------------------------------------------------------------- */

export async function getAboutInfo() {
  const [aboutResult, indicators] = await Promise.all([
    supabase.from('about_info').select('*').eq('id', 1).maybeSingle(),
    getIndicators('nosotros'),
  ]);
  if (aboutResult.error) {
    throw toAppError(aboutResult.error, 'No se pudo cargar la información de Sobre mí.');
  }

  const row = aboutResult.data;
  if (!row) return { ...EMPTY_ABOUT_INFO, indicators };

  // Se arma el mismo objeto que usaba la app con LocalStorage
  return {
    brandDescription: row.brand_description,
    indicators,
    owner: {
      name: row.owner_name,
      role: row.owner_role,
      bio: row.owner_bio,
      photo: row.owner_photo_url,
    },
    phases: {
      reunion: row.phase_reunion,
      bocetos: row.phase_bocetos,
      desarrollo: row.phase_desarrollo,
      despliegue: row.phase_despliegue,
    },
  };
}

export function validateAboutInfo(data) {
  const errors = {};
  if (data.brandDescription.trim().length < 20) {
    errors.brandDescription = 'La descripción debe tener mínimo 20 caracteres.';
  } else if (isTooLong(data.brandDescription, MAX_LENGTH.BRAND_DESCRIPTION)) {
    errors.brandDescription = tooLongMessage(MAX_LENGTH.BRAND_DESCRIPTION);
  }
  if (data.owner.name.trim().length < 3) errors.ownerName = 'Escribe el nombre.';
  else if (isTooLong(data.owner.name, MAX_LENGTH.PERSON_NAME)) errors.ownerName = tooLongMessage(MAX_LENGTH.PERSON_NAME);
  if (data.owner.role.trim().length < 3) errors.ownerRole = 'Escribe el cargo.';
  else if (isTooLong(data.owner.role, MAX_LENGTH.OWNER_ROLE)) errors.ownerRole = tooLongMessage(MAX_LENGTH.OWNER_ROLE);
  if (data.owner.bio.trim().length < 20) errors.ownerBio = 'La biografía debe tener mínimo 20 caracteres.';
  else if (isTooLong(data.owner.bio, MAX_LENGTH.OWNER_BIO)) errors.ownerBio = tooLongMessage(MAX_LENGTH.OWNER_BIO);

  // Cada una de las 4 fases debe tener su explicación
  Object.entries(data.phases).forEach(([phaseKey, text]) => {
    if (text.trim().length < 10) {
      errors[`phase_${phaseKey}`] = 'Explica esta fase (mínimo 10 caracteres).';
    } else if (isTooLong(text, MAX_LENGTH.PHASE_TEXT)) {
      errors[`phase_${phaseKey}`] = tooLongMessage(MAX_LENGTH.PHASE_TEXT);
    }
  });

  const indicatorsError = validateIndicators(data.indicators);
  if (indicatorsError) errors.indicators = indicatorsError;

  return errors;
}

/**
 * Guarda la información de Sobre mí.
 * La foto puede llegar de tres formas:
 *   - owner.photoFile (Blob): foto NUEVA elegida -> se sube a Storage.
 *   - owner.photo con una URL: se conserva la foto que ya estaba.
 *   - owner.photo vacío: se quitó la foto.
 * Si la foto cambió o se quitó, el archivo viejo se borra de Storage.
 */
export async function saveAboutInfo(data) {
  const errors = validateAboutInfo(data);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  // URL de la foto guardada hoy (para borrarla si se reemplaza)
  const { data: currentRow } = await supabase.from('about_info').select('owner_photo_url').eq('id', 1).maybeSingle();
  const previousPhoto = currentRow?.owner_photo_url || '';

  // Foto nueva: primero se sube y se obtiene su URL pública
  let photoUrl = data.owner.photoFile ? '' : data.owner.photo || '';
  if (data.owner.photoFile) {
    photoUrl = await uploadPublicFile(BUCKETS.SITE_ASSETS, 'owner', data.owner.photoFile);
  }

  const cleanData = {
    brandDescription: data.brandDescription.trim(),
    indicators: cleanIndicators(data.indicators),
    owner: {
      name: data.owner.name.trim(),
      role: data.owner.role.trim(),
      bio: data.owner.bio.trim(),
      photo: photoUrl,
    },
    phases: Object.fromEntries(
      Object.entries(data.phases).map(([phaseKey, text]) => [phaseKey, text.trim()])
    ),
  };

  const { error } = await supabase.rpc('save_about_info', { payload: cleanData });
  if (error) {
    // No se guardó: la foto recién subida sobra y se borra
    if (data.owner.photoFile) await removePublicFiles(BUCKETS.SITE_ASSETS, [photoUrl]);
    throw toAppError(error, 'No se pudo guardar la información de Sobre mí.');
  }

  // Ya guardado: si la foto anterior ya no se usa, se borra de Storage
  if (previousPhoto && previousPhoto !== photoUrl) {
    await removePublicFiles(BUCKETS.SITE_ASSETS, [previousPhoto]);
  }
  return cleanData;
}
