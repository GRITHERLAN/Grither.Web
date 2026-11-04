/* ==========================================================================
   FUNCIONES DE VALIDACIÓN REUTILIZABLES (backend)
   --------------------------------------------------------------------------
   Copia de frontend/src/utils/validators.js. El frontend las usa para dar
   mensajes al instante mientras se escribe; el backend las vuelve a usar
   porque es quien MANDA: cualquiera podría llamar a la API saltándose el
   formulario.
   Si se cambia un límite aquí, hay que cambiarlo también en el frontend
   (y en la regla CHECK de la tabla, si existe).
   ========================================================================== */

/* Largo máximo de cada campo de texto (los mismos de las reglas CHECK) */
export const MAX_LENGTH = {
  PERSON_NAME: 80, // nombre de usuario, empresa o dueño de la marca
  EMAIL: 254, // máximo de un correo según el estándar
  PASSWORD: 72, // límite del cifrado bcrypt que usa Supabase Auth
  PHONE: 20,
  CITY: 80, // ciudad del Responsable (páginas legales)
  URL: 500,
  PROJECT_ID: 20,
  PROJECT_NAME: 80,
  PROJECT_DESCRIPTION: 2000,
  CANCEL_REASON: 500,
  BRAND_DESCRIPTION: 600,
  OWNER_ROLE: 80,
  OWNER_BIO: 1000,
  PHASE_TEXT: 400,
  INDICATOR_VALUE: 20,
  INDICATOR_LABEL: 60,
  CARD_TITLE: 60, // título de servicio o nombre de plan
  CARD_DESCRIPTION: 300,
  CARD_ITEM: 80, // cada etiqueta o característica
  CTA_TEXT: 40, // texto del botón de un plan
  PORTFOLIO_TITLE: 80,
  PORTFOLIO_DESCRIPTION: 300,
  PORTFOLIO_CATEGORY: 40,
};

/** Convierte cualquier valor en texto sin espacios a los lados ('' si no hay nada) */
export function cleanText(value) {
  return String(value ?? '').trim();
}

/** true si el texto (sin espacios a los lados) supera el largo máximo */
export function isTooLong(value, max) {
  return cleanText(value).length > max;
}

/** Mensaje estándar para un texto demasiado largo */
export function tooLongMessage(max) {
  return `Máximo ${max} caracteres.`;
}

/** Revisa que un texto tenga forma de correo: algo@algo.algo */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanText(email));
}

/** Revisa que un texto sea un enlace válido (http, https, mailto o tel) */
export function isValidUrl(value) {
  try {
    const url = new URL(cleanText(value));
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/** Revisa que un teléfono tenga solo números, espacios, +, - o paréntesis */
export function isValidPhone(phone) {
  return /^[+\d\s()-]{7,20}$/.test(cleanText(phone));
}

/**
 * Normaliza un texto para comparar sin importar mayúsculas,
 * tildes ni espacios extra. "  App  Médica " -> "app medica"
 */
export function normalizeText(text) {
  return cleanText(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/\s+/g, ' '); // deja un solo espacio entre palabras
}

/**
 * Valida una lista de textos (etiquetas, características, tecnologías).
 * @returns {string} mensaje de error o cadena vacía si está bien
 */
export function validateStringList(list, singularName) {
  if (!Array.isArray(list) || list.length === 0) return `Agrega al menos ${singularName}.`;
  if (list.some((item) => cleanText(item).length === 0)) return 'No dejes elementos vacíos.';
  if (list.some((item) => isTooLong(item, MAX_LENGTH.CARD_ITEM))) {
    return `Cada elemento puede tener máximo ${MAX_LENGTH.CARD_ITEM} caracteres.`;
  }
  return '';
}

/** Quita espacios extra de cada texto de una lista */
export function cleanStringList(list) {
  return list.map((item) => cleanText(item));
}
