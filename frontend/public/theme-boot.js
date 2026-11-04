/* ==========================================================================
   TEMA ANTES DE PINTAR (Oscuro / Claro)
   --------------------------------------------------------------------------
   Se carga en el <head> antes que todo lo demás. Pone el tema guardado en
   <html data-theme="..."> ANTES de que el navegador pinte la página; así la
   cortina de carga y el fondo salen del color correcto desde el primer
   instante (sin un parpadeo negro en modo claro).
   Usa la misma regla que getInitialTheme() en src/context/ThemeContext.jsx:
   el tema guardado, o si no hay, el del sistema operativo.
   Es un archivo aparte (y no un <script> dentro del HTML) porque la política
   de seguridad (CSP) solo permite scripts que vengan de archivos del sitio.
   ========================================================================== */

/* Las const van dentro del bloque try: así no quedan como variables globales */
try {
  const savedTheme = JSON.parse(window.localStorage.getItem('grither_theme'));
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

  let theme = prefersLight ? 'light' : 'dark';
  if (savedTheme === 'dark' || savedTheme === 'light') theme = savedTheme;

  document.documentElement.dataset.theme = theme;
} catch {
  // Almacenamiento bloqueado o valor dañado: se queda el tema oscuro del HTML
}
