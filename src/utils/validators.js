/* ==========================================================================
   FUNCIONES DE VALIDACIÓN REUTILIZABLES
   --------------------------------------------------------------------------
   Pequeñas funciones puras (sin efectos) que responden true/false.
   Las usan tanto los formularios (frontend) como los servicios (backend).
   ========================================================================== */

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
