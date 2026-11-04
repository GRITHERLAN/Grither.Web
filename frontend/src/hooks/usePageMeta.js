/* ==========================================================================
   HOOK: usePageMeta
   --------------------------------------------------------------------------
   Cambia las etiquetas SEO del <head> según la página que se está viendo
   (la web es una SPA: sin esto todas las páginas tendrían el mismo título).

   Uso:
     usePageMeta('/contacto');   // página pública: usa los datos de data/seo.js
     usePageMeta(null);          // página privada o 404: se marca "noindex"

   Actualiza: <title>, description, canonical, robots, Open Graph y Twitter.
   No usa librerías externas ni innerHTML: crea los elementos con
   document.createElement y les asigna los atributos.
   ========================================================================== */

import { useEffect } from 'react';
import { OG_IMAGE_PATH, PRIVATE_META, SITE_NAME, buildUrl, getPageSeo, normalizeSiteUrl } from '../data/seo.js';

/* Dominio del sitio (se define en .env con VITE_SITE_URL) */
const SITE_URL = normalizeSiteUrl(import.meta.env.VITE_SITE_URL);

/**
 * Busca una etiqueta del <head> con ese selector; si no existe la crea.
 * Devuelve el elemento para poder asignarle sus atributos.
 */
function getOrCreateTag(tagName, selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement(tagName);
    // Atributos que identifican la etiqueta (ej. name="description")
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    document.head.appendChild(element);
  }

  return element;
}

/* <meta name="..." content="..."> */
function setNameMeta(name, content) {
  getOrCreateTag('meta', `meta[name="${name}"]`, { name }).setAttribute('content', content);
}

/* <meta property="og:..." content="..."> */
function setPropertyMeta(property, content) {
  getOrCreateTag('meta', `meta[property="${property}"]`, { property }).setAttribute('content', content);
}

export function usePageMeta(path) {
  useEffect(() => {
    let page = path ? getPageSeo(path) : undefined;
    let isPublic = Boolean(page);

    let title = isPublic ? page.title : PRIVATE_META.title;
    let description = isPublic ? page.description : PRIVATE_META.description;
    let url = isPublic ? buildUrl(SITE_URL, page.path) : null;
    let image = `${SITE_URL}${OG_IMAGE_PATH}`;

    document.title = title;
    setNameMeta('description', description);

    // Páginas privadas / 404: que Google no las indexe. Públicas: sí.
    setNameMeta('robots', isPublic ? 'index, follow' : 'noindex, nofollow');

    // Canonical: solo las páginas públicas tienen uno
    let canonical = getOrCreateTag('link', 'link[rel="canonical"]', { rel: 'canonical' });
    if (isPublic) {
      canonical.setAttribute('href', url);
    } else {
      canonical.remove();
    }

    // Open Graph (vista previa al compartir en WhatsApp, LinkedIn, Facebook...)
    setPropertyMeta('og:title', title);
    setPropertyMeta('og:description', description);
    setPropertyMeta('og:image', image);
    setPropertyMeta('og:site_name', SITE_NAME);
    setPropertyMeta('og:type', 'website');
    setPropertyMeta('og:locale', 'es_CO');
    if (isPublic) setPropertyMeta('og:url', url);

    // Twitter / X
    setNameMeta('twitter:card', 'summary_large_image');
    setNameMeta('twitter:title', title);
    setNameMeta('twitter:description', description);
    setNameMeta('twitter:image', image);
  }, [path]);
}
