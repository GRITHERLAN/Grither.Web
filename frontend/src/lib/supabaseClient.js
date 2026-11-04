/* ==========================================================================
   CLIENTE DE SUPABASE (único para toda la aplicación)
   --------------------------------------------------------------------------
   Supabase reemplaza a LocalStorage como fuente de datos:
     - Base de datos (Postgres) con seguridad por filas (RLS).
     - Autenticación (Supabase Auth) para el login.
     - Storage para las imágenes y videos.

   Las credenciales salen de las variables de entorno (.env.local):
     VITE_SUPABASE_URL              -> dirección del proyecto
     VITE_SUPABASE_PUBLISHABLE_KEY  -> llave PÚBLICA (puede ir en el navegador;
                                       lo que protege los datos es la RLS)
   La llave secreta (service_role) NUNCA va en el frontend.
   ========================================================================== */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Si faltan las variables, avisamos claro en la consola del desarrollador
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Copia .env.example como .env.local y complétalo.'
  );
}

/* --------------------------------------------------------------------------
   "Recordarme en este dispositivo"
   --------------------------------------------------------------------------
   Antes la sesión se guardaba en localStorage (recordarme) o en
   sessionStorage (se borra al cerrar el navegador). Para conservar ese
   comportamiento, le damos a Supabase un "almacén" propio que decide dónde
   guardar la sesión según lo que eligió el usuario al iniciar sesión.
   -------------------------------------------------------------------------- */

/* Clave donde se recuerda la elección de la casilla (true / false) */
const REMEMBER_KEY = 'grither_remember';

/** Devuelve el almacenamiento elegido: localStorage (recordar) o sessionStorage */
function getChosenStore() {
  return window.localStorage.getItem(REMEMBER_KEY) === 'false' ? window.sessionStorage : window.localStorage;
}

/** Almacén que Supabase usa para guardar y leer la sesión */
const rememberAwareStorage = {
  getItem(key) {
    // La sesión puede estar en cualquiera de los dos lugares
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  },
  setItem(key, value) {
    const chosen = getChosenStore();
    const other = chosen === window.localStorage ? window.sessionStorage : window.localStorage;
    chosen.setItem(key, value);
    other.removeItem(key); // nunca dejamos una copia vieja en el otro lugar
  },
  removeItem(key) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

/**
 * Guarda la elección de "Recordarme" ANTES de iniciar sesión,
 * para que la sesión nueva se guarde en el lugar correcto.
 * @param {boolean} remember
 */
export function setRememberSession(remember) {
  window.localStorage.setItem(REMEMBER_KEY, String(Boolean(remember)));
}

/* --------------------------------------------------------------------------
   Cliente
   -------------------------------------------------------------------------- */
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: rememberAwareStorage,
    persistSession: true, // conserva la sesión al recargar
    autoRefreshToken: true, // renueva la sesión antes de que venza
    detectSessionInUrl: false, // no usamos enlaces mágicos ni OAuth
  },
});
