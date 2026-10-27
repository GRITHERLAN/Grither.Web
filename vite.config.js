// Configuración de Vite: plugin oficial de React (JSX y recarga rápida en
// desarrollo) + un plugin propio que agrega la política de seguridad CSP.
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content-Security-Policy (CSP): le dice al navegador de qué sitios puede
 * cargar scripts, imágenes, videos y conexiones. Si alguien lograra meter
 * código malicioso en la página (XSS), el navegador no lo ejecutaría ni lo
 * dejaría enviar datos a otro servidor.
 *   - Scripts, estilos y fuentes: solo del propio sitio.
 *   - Imágenes y videos: del propio sitio, de Supabase Storage y vistas
 *     previas locales (blob:, data:).
 *   - Conexiones: solo a Supabase (API, Auth, Storage y tiempo real).
 *
 * Solo se agrega al compilar (npm run build). En "npm run dev" Vite necesita
 * scripts en línea para la recarga rápida y la CSP los bloquearía.
 *
 * Nota: frame-ancestors (no dejar que otra web meta esta en un <iframe>) no
 * funciona en una etiqueta <meta>; va en los encabezados del hosting (ver
 * Auditoria_Seguridad.md > Security Headers).
 */
function cspPlugin(supabaseUrl) {
  // Si falta la URL en .env.local se permite cualquier proyecto de Supabase
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : 'https://*.supabase.co';
  const supabaseSocket = supabaseOrigin.replace('https://', 'wss://');

  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "font-src 'self'",
    `img-src 'self' data: blob: ${supabaseOrigin}`,
    `media-src 'self' blob: ${supabaseOrigin}`,
    `connect-src 'self' ${supabaseOrigin} ${supabaseSocket}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return {
    name: 'grither-csp',
    apply: 'build', // solo en producción
    transformIndexHtml() {
      return [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
        // No enviar la ruta completa de la página a otros sitios al hacer clic en un enlace
        { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head' },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  // Lee .env.local para saber la URL exacta del proyecto de Supabase
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react(), cspPlugin(env.VITE_SUPABASE_URL)],
  };
});
