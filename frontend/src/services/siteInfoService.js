/* ==========================================================================
   SERVICIO DE INFORMACIÓN DEL SITIO
   --------------------------------------------------------------------------
   Lee y guarda la información editable solo por el Administrador:
     - Contacto  (correo, teléfono, redes, descripción, indicadores)
     - Nosotros  (descripción, indicadores, quién está detrás, fases)

   Fuente de datos: la API del backend
     GET/PUT /api/contact  y  GET/PUT /api/about
   El backend vuelve a validar y guarda TODO el bloque (con sus indicadores).
   Aquí se valida antes solo para mostrar los errores al instante.
   La UI recibe los mismos objetos de antes (camelCase), así que no cambia.
   ========================================================================== */

import { ValidationError } from './errors.js';
import { apiRequest } from './apiClient.js';
import { BUCKETS, uploadPublicFile } from './storageFiles.js';
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

/** Quita espacios extra de cada indicador */
function cleanIndicators(indicators) {
  return indicators.map((item) => ({ value: item.value.trim(), label: item.label.trim() }));
}

/* --------------------------------------------------------------------------
   Contacto
   -------------------------------------------------------------------------- */

/** Contacto + sus indicadores (si la tabla está vacía, el backend manda todo en blanco) */
export async function getContactInfo() {
  return apiRequest('/api/contact');
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

  // El backend guarda contacto + indicadores y devuelve cómo quedó
  return apiRequest('/api/contact', { method: 'PUT', body: cleanData });
}

/* --------------------------------------------------------------------------
   Sobre mí
   -------------------------------------------------------------------------- */

/** "Sobre mí" + sus indicadores (si la tabla está vacía, el backend manda todo en blanco) */
export async function getAboutInfo() {
  return apiRequest('/api/about');
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
 * Si la foto cambió o se quitó, el backend borra el archivo viejo de Storage
 * (y si no se pudo guardar, también borra la foto recién subida).
 */
export async function saveAboutInfo(data) {
  const errors = validateAboutInfo(data);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

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

  // El backend guarda todo, limpia las fotos que sobran y devuelve cómo quedó
  return apiRequest('/api/about', { method: 'PUT', body: cleanData });
}
