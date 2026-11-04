/* ==========================================================================
   PREFERENCIAS LOCALES DEL NAVEGADOR
   --------------------------------------------------------------------------
   Los datos de la app viven en Supabase. En el navegador solo queda la
   preferencia de tema (Oscuro / Claro), que es propia de cada dispositivo.

   También se borran, una sola vez, las claves de la versión anterior que
   guardaba todo en LocalStorage (usuarios con hash de contraseña, proyectos,
   sesión...). Ya no se usan y no conviene dejarlas en el navegador.
   ========================================================================== */

/* Clave del tema (la misma de antes, para conservar la preferencia) */
const THEME_KEY = 'grither_theme';

/* Claves de la versión con LocalStorage que ya no se usan */
const LEGACY_KEYS = [
  'grither_users',
  'grither_session',
  'grither_projects',
  'grither_contactInfo',
  'grither_aboutInfo',
  'grither_services',
  'grither_plans',
];

/** Lee el tema guardado ('dark' | 'light') o null si no hay */
export function readTheme() {
  try {
    return JSON.parse(window.localStorage.getItem(THEME_KEY));
  } catch {
    return null; // valor dañado o almacenamiento bloqueado
  }
}

/** Guarda el tema elegido (si no se puede, el tema igual funciona en esta visita) */
export function saveTheme(theme) {
  try {
    window.localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch {
    // Almacenamiento lleno o bloqueado: no es grave
  }
}

/** Borra los datos viejos de LocalStorage (se llama una vez al iniciar la app) */
export function removeLegacyData() {
  try {
    LEGACY_KEYS.forEach((key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    });
  } catch {
    // Si el navegador bloquea el almacenamiento no hay nada que borrar
  }
}
