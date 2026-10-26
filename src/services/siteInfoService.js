/* ==========================================================================
   SERVICIO DE INFORMACIÓN DEL SITIO
   --------------------------------------------------------------------------
   Lee y guarda la información editable solo por el Administrador:
     - Contacto  (correo, teléfono, redes, descripción, indicadores)
     - Nosotros  (descripción, indicadores, quién está detrás, fases)
   ========================================================================== */

import { readStorage, writeStorage, STORAGE_KEYS } from './storage.js';
import { ValidationError } from './errors.js';
import { isValidEmail, isValidPhone, isValidUrl } from '../utils/validators.js';
import { DEFAULT_CONTACT_INFO, DEFAULT_ABOUT_INFO } from '../data/seed.js';

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
  return hasEmpty ? 'Completa el valor y la descripción de cada indicador.' : '';
}

/** Quita espacios extra de cada indicador */
function cleanIndicators(indicators) {
  return indicators.map((item) => ({ value: item.value.trim(), label: item.label.trim() }));
}

/* --------------------------------------------------------------------------
   Contacto
   -------------------------------------------------------------------------- */

export function getContactInfo() {
  return readStorage(STORAGE_KEYS.CONTACT, DEFAULT_CONTACT_INFO);
}

export function validateContactInfo(data) {
  const errors = {};
  if (!isValidEmail(data.email)) errors.email = 'Escribe un correo válido.';
  if (!isValidPhone(data.phone)) errors.phone = 'Escribe un teléfono válido (ej. +57 300 000 0000).';
  if (data.brandDescription.trim().length < 20) {
    errors.brandDescription = 'La descripción debe tener mínimo 20 caracteres.';
  }
  if (!isValidUrl(data.instagram)) errors.instagram = 'Escribe el enlace completo de Instagram.';
  if (!isValidUrl(data.linkedin)) errors.linkedin = 'Escribe el enlace completo de LinkedIn.';
  if (!isValidUrl(data.portfolio)) errors.portfolio = 'Escribe el enlace completo del portafolio.';

  const indicatorsError = validateIndicators(data.indicators);
  if (indicatorsError) errors.indicators = indicatorsError;

  return errors;
}

export function saveContactInfo(data) {
  const errors = validateContactInfo(data);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  const cleanData = {
    email: data.email.trim(),
    phone: data.phone.trim(),
    brandDescription: data.brandDescription.trim(),
    instagram: data.instagram.trim(),
    linkedin: data.linkedin.trim(),
    portfolio: data.portfolio.trim(),
    indicators: cleanIndicators(data.indicators),
  };
  writeStorage(STORAGE_KEYS.CONTACT, cleanData);
  return cleanData;
}

/* --------------------------------------------------------------------------
   Sobre nosotros
   -------------------------------------------------------------------------- */

export function getAboutInfo() {
  return readStorage(STORAGE_KEYS.ABOUT, DEFAULT_ABOUT_INFO);
}

export function validateAboutInfo(data) {
  const errors = {};
  if (data.brandDescription.trim().length < 20) {
    errors.brandDescription = 'La descripción debe tener mínimo 20 caracteres.';
  }
  if (data.owner.name.trim().length < 3) errors.ownerName = 'Escribe el nombre.';
  if (data.owner.role.trim().length < 3) errors.ownerRole = 'Escribe el cargo.';
  if (data.owner.bio.trim().length < 20) errors.ownerBio = 'La biografía debe tener mínimo 20 caracteres.';

  // Cada una de las 4 fases debe tener su explicación
  Object.entries(data.phases).forEach(([phaseKey, text]) => {
    if (text.trim().length < 10) {
      errors[`phase_${phaseKey}`] = 'Explica esta fase (mínimo 10 caracteres).';
    }
  });

  const indicatorsError = validateIndicators(data.indicators);
  if (indicatorsError) errors.indicators = indicatorsError;

  return errors;
}

export function saveAboutInfo(data) {
  const errors = validateAboutInfo(data);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  const cleanData = {
    brandDescription: data.brandDescription.trim(),
    indicators: cleanIndicators(data.indicators),
    owner: {
      name: data.owner.name.trim(),
      role: data.owner.role.trim(),
      bio: data.owner.bio.trim(),
      photo: data.owner.photo || '',
    },
    phases: Object.fromEntries(
      Object.entries(data.phases).map(([phaseKey, text]) => [phaseKey, text.trim()])
    ),
  };
  writeStorage(STORAGE_KEYS.ABOUT, cleanData);
  return cleanData;
}
