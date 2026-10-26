/* ==========================================================================
   SERVICIO DE ALMACENAMIENTO (LocalStorage)
   --------------------------------------------------------------------------
   Es la ÚNICA puerta de entrada a LocalStorage en toda la aplicación.
   Centralizarlo aquí permite:
     1. Guardar y leer siempre en formato JSON.
     2. Usar un prefijo ("grither_") para no chocar con otras webs.
     3. Atrapar el error de "almacenamiento lleno" y convertirlo en un
        mensaje en español que la interfaz pueda mostrar.
   ========================================================================== */

import { AppError } from './errors.js';

/* Prefijo de todas las claves guardadas en el navegador */
const PREFIX = 'grither_';

/* Nombres de las claves usadas por la aplicación (evita errores de tipeo) */
export const STORAGE_KEYS = {
  USERS: 'users',
  SESSION: 'session',
  THEME: 'theme',
  PROJECTS: 'projects',
  CONTACT: 'contactInfo',
  ABOUT: 'aboutInfo',
  SERVICES: 'services', // cards de "Qué hacemos"
  PLANS: 'plans', // cards de "Planes"
};

/**
 * Lee un valor guardado y lo convierte de JSON a objeto.
 * @param {string} key - Clave sin prefijo (usar STORAGE_KEYS).
 * @param {*} fallback - Valor a devolver si no existe o está dañado.
 * @param {Storage} store - localStorage (por defecto) o sessionStorage.
 */
export function readStorage(key, fallback = null, store = window.localStorage) {
  try {
    const rawValue = store.getItem(PREFIX + key);

    // Si nunca se guardó nada, devolvemos el valor por defecto
    if (rawValue === null) {
      return fallback;
    }

    return JSON.parse(rawValue);
  } catch {
    // Si el JSON está corrupto no rompemos la app: usamos el valor por defecto
    return fallback;
  }
}

/**
 * Guarda un valor convirtiéndolo a JSON.
 * Lanza AppError con un mensaje claro si el navegador no tiene espacio.
 */
export function writeStorage(key, value, store = window.localStorage) {
  try {
    store.setItem(PREFIX + key, JSON.stringify(value));
  } catch (error) {
    // Cada navegador nombra distinto el error de cuota; revisamos ambos nombres
    const isQuotaError =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

    if (isQuotaError) {
      throw new AppError(
        'El almacenamiento del navegador está lleno. Usa imágenes más livianas o elimina archivos de otros proyectos.'
      );
    }

    throw new AppError('No se pudo guardar la información en el navegador.');
  }
}

/** Elimina una clave guardada */
export function removeStorage(key, store = window.localStorage) {
  store.removeItem(PREFIX + key);
}
