/* ==========================================================================
   FUNCIONES DE VALIDACIÓN REUTILIZABLES
   --------------------------------------------------------------------------
   Pequeñas funciones puras (sin efectos) que responden true/false.
   Las usan tanto los formularios (frontend) como los servicios (backend).
   ========================================================================== */

/* --------------------------------------------------------------------------
   Largo máximo de cada campo de texto
   --------------------------------------------------------------------------
   Se usan en dos lugares:
     - En los formularios, como atributo maxLength (no deja escribir más).
     - En los servicios, para volver a revisar antes de guardar.
   Son los mismos límites de la migración (reglas CHECK)
   supabase/migrations/20261027200000_endurecer_seguridad.sql: si se cambia
   uno, hay que cambiarlo en los dos lados.
   -------------------------------------------------------------------------- */
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
  CONTACT_MESSAGE: 2000,
  SEARCH: 80, // buscadores de los filtros
};

/** true si el texto (sin espacios a los lados) supera el largo máximo */
export function isTooLong(value, max) {
  return String(value ?? '').trim().length > max;
}

/** Mensaje estándar para un texto demasiado largo */
export function tooLongMessage(max) {
  return `Máximo ${max} caracteres.`;
}

/** Revisa que un texto tenga forma de correo: algo@algo.algo */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
}

/** Revisa que un texto sea un enlace válido (http, https, mailto o tel) */
export function isValidUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Devuelve el enlace solo si es seguro (http, https, mailto o tel).
 * Se usa al PINTAR enlaces que vienen de la base de datos: aunque ya se
 * validaron al guardar, si alguien guardara "javascript:..." llamando a la
 * API directamente, aquí se cambia por "#" y no se ejecuta nada.
 */
export function toSafeHref(value) {
  return isValidUrl(value) ? String(value).trim() : '#';
}

/** Revisa que un teléfono tenga solo números, espacios, +, - o paréntesis */
export function isValidPhone(phone) {
  return /^[+\d\s()-]{7,20}$/.test(String(phone).trim());
}

/**
 * Normaliza un texto para comparar sin importar mayúsculas,
 * tildes ni espacios extra. "  App  Médica " -> "app medica"
 */
export function normalizeText(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/\s+/g, ' '); // deja un solo espacio entre palabras
}
