// Configuración de Vite: plugin oficial de React (JSX y recarga rápida en
// desarrollo) + un plugin propio que agrega la política de seguridad CSP.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {
  INTERNAL_LINKS,
  OG_IMAGE_PATH,
  PUBLIC_PAGES,
  SITE_NAME,
  buildOrganizationSchema,
  buildPageSchema,
  buildUrl,
  normalizeSiteUrl,
} from './src/data/seo.js';

/**
 * Content-Security-Policy (CSP): le dice al navegador de qué sitios puede
 * cargar scripts, imágenes, videos y conexiones. Si alguien lograra meter
 * código malicioso en la página (XSS), el navegador no lo ejecutaría ni lo
 * dejaría enviar datos a otro servidor.
 *   - Scripts: del propio sitio y de Google Analytics (googletagmanager.com).
 *   - Estilos y fuentes: solo del propio sitio.
 *   - Imágenes y videos: del propio sitio, de Supabase Storage y vistas
 *     previas locales (blob:, data:).
 *   - Conexiones: a Supabase (API, Auth, Storage y tiempo real) y a Google Analytics.
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
    // Google Analytics (gtag.js). Solo se descarga si el visitante acepta el banner de cookies.
    "script-src 'self' https://www.googletagmanager.com",
    "style-src 'self'",
    "font-src 'self'",
    `img-src 'self' data: blob: ${supabaseOrigin} https://*.google-analytics.com https://*.googletagmanager.com`,
    `media-src 'self' blob: ${supabaseOrigin}`,
    `connect-src 'self' ${supabaseOrigin} ${supabaseSocket} https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`,
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

/* Convierte texto en algo seguro para ponerlo dentro de un atributo o de una etiqueta HTML */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Plugin SEO (solo al compilar). La web es una SPA: todas las URLs devuelven el
 * mismo index.html vacío y React dibuja el contenido después. Para que Google
 * vea título, descripción, canonical, datos estructurados y un texto base de
 * cada página SIN ejecutar JavaScript, este plugin:
 *   1. Crea un HTML por página pública (dist/contacto/index.html, etc.) a
 *      partir del index.html ya compilado, cambiando sus etiquetas <head>.
 *   2. Genera dist/sitemap.xml con las páginas públicas.
 * Los datos salen de src/data/seo.js, el mismo archivo que usa el hook
 * usePageMeta en el navegador, así nunca quedan desincronizados.
 */
function seoPlugin(siteUrlFromEnv) {
  let outDir = 'dist';
  const siteUrl = normalizeSiteUrl(siteUrlFromEnv);

  /* Construye el HTML completo de una página a partir de la plantilla compilada */
  function buildPageHtml(template, page) {
    const url = buildUrl(siteUrl, page.path);
    const image = `${siteUrl}${OG_IMAGE_PATH}`;
    const schemas = [buildOrganizationSchema(siteUrl), buildPageSchema(siteUrl, page)];

    // Etiquetas nuevas que se agregan al final del <head>
    const headTags = [
      `<link rel="canonical" href="${escapeHtml(url)}" />`,
      '<meta name="robots" content="index, follow" />',
      '<meta property="og:type" content="website" />',
      '<meta property="og:locale" content="es_CO" />',
      `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
      `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
      `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
      `<meta property="og:url" content="${escapeHtml(url)}" />`,
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
      '<meta name="twitter:card" content="summary_large_image" />',
      `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
      `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
      // "<" se escapa para que el JSON nunca pueda cerrar la etiqueta <script>
      ...schemas.map((schema) => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`),
    ].join('\n    ');

    // Contenido base dentro de #root: lo leen los rastreadores que no ejecutan
    // JavaScript (un <noscript> lo ignoran). Cuando React monta, createRoot().render
    // reemplaza todo lo que haya dentro de #root, así que el visitante no ve duplicados.
    const links = INTERNAL_LINKS.map((link) => `<a href="${link.path}">${escapeHtml(link.label)}</a>`).join(' · ');
    const sections = (page.sections || [])
      .map(
        (section) =>
          `<section><h2>${escapeHtml(section.h2)}</h2>` +
          section.paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join('') +
          '</section>',
      )
      .join('');
    const externalLinks = (page.externalLinks || [])
      .map((link) => `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`)
      .join(' · ');
    const staticContent =
      `<main class="container"><h1>${escapeHtml(page.h1)}</h1><p>${escapeHtml(page.intro)}</p>` +
      `${sections}<nav aria-label="Principal">${links}</nav>` +
      `${externalLinks ? `<p>${externalLinks}</p>` : ''}</main>`;

    return template
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
      .replace('</head>', `    ${headTags}\n  </head>`)
      .replace('<div id="root"></div>', () => `<div id="root">${staticContent}</div>`);
  }

  /* sitemap.xml: lista de páginas públicas para Google */
  function buildSitemap() {
    const today = new Date().toISOString().slice(0, 10);
    const urls = PUBLIC_PAGES.map(
      (page) =>
        `  <url>\n    <loc>${escapeHtml(buildUrl(siteUrl, page.path))}</loc>\n    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`,
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  }

  return {
    name: 'grither-seo',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const template = readFileSync(resolve(outDir, 'index.html'), 'utf-8');

      PUBLIC_PAGES.forEach((page) => {
        // "/" reemplaza dist/index.html; el resto va en su propia carpeta
        const folder = page.path === '/' ? outDir : resolve(outDir, page.path.slice(1));
        mkdirSync(folder, { recursive: true });
        writeFileSync(resolve(folder, 'index.html'), buildPageHtml(template, page));
      });

      writeFileSync(resolve(outDir, 'sitemap.xml'), buildSitemap());
    },
  };
}

export default defineConfig(({ mode }) => {
  // Lee .env.local para saber la URL exacta del proyecto de Supabase y el dominio
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react(), cspPlugin(env.VITE_SUPABASE_URL), seoPlugin(env.VITE_SITE_URL)],
  };
});
