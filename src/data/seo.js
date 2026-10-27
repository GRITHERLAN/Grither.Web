/* ==========================================================================
   DATOS SEO (una sola fuente de verdad)
   --------------------------------------------------------------------------
   Este archivo lo usan DOS lugares:
     1. El hook usePageMeta (en el navegador) para cambiar el título, la
        descripción y el canonical cuando el usuario navega entre páginas.
     2. El plugin de Vite (vite.config.js) al compilar, para generar el
        sitemap.xml y un HTML por página con sus etiquetas meta y JSON-LD,
        de modo que Google vea el contenido sin ejecutar JavaScript.
   Por eso NO usa import.meta.env ni nada propio del navegador.
   ========================================================================== */

/* Dominio de producción por defecto (se puede sobreescribir con VITE_SITE_URL) */
export const DEFAULT_SITE_URL = 'https://www.gritherweb.com';

export const SITE_NAME = 'Grither';
export const WHATSAPP_URL = 'https://wa.link/0wzo59';

/* Imagen que se muestra al compartir el enlace en redes (ruta dentro de /public) */
export const OG_IMAGE_PATH = '/og-image.png';

/* Páginas públicas e indexables. "h1" y "intro" se escriben en el HTML
   estático para quienes no ejecutan JavaScript (rastreadores, lectores). */
export const PUBLIC_PAGES = [
  {
    path: '/',
    title: 'Grither · Desarrollo web a medida en Colombia',
    description:
      'Grither crea landing pages, sitios web y aplicaciones web a la medida para negocios en Colombia. Conoce los servicios, planes y cómo trabajamos.',
    h1: 'Construimos la web que tu negocio necesita para crecer.',
    intro:
      'Desarrollo web freelance en Colombia: landing pages, sitios web, aplicaciones web y soporte, desde la reunión inicial hasta el despliegue.',
    schemaType: 'WebPage',
    changefreq: 'monthly',
    priority: '1.0',
  },
  {
    path: '/sobre-nosotros',
    title: 'Sobre nosotros · Quién es Grither y cómo trabaja',
    description:
      'Conoce quién está detrás de Grither, las tecnologías que usa y el proceso de trabajo: reunión, bocetos, desarrollo y despliegue.',
    h1: 'Le damos alas a las ideas digitales.',
    intro:
      'Conoce al desarrollador detrás de Grither y las cuatro fases con las que convertimos tu idea en una web publicada.',
    schemaType: 'AboutPage',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/contacto',
    title: 'Contacto · Cuéntanos tu proyecto web | Grither',
    description:
      'Escríbenos para cotizar tu página web o aplicación. Contacto por correo, WhatsApp y redes sociales. Respondemos rápido.',
    h1: 'Cuéntanos tu idea. Te respondemos hoy.',
    intro: 'Cuéntanos qué necesitas y te respondemos con una propuesta para tu proyecto web.',
    schemaType: 'ContactPage',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/politica-de-privacidad',
    title: 'Política de privacidad | Grither',
    description: 'Cómo Grither trata tus datos personales conforme a la Ley 1581 de 2012 de Colombia.',
    h1: 'Política de privacidad',
    intro: 'Tratamiento de datos personales conforme a la Ley 1581 de 2012.',
    schemaType: 'WebPage',
    changefreq: 'yearly',
    priority: '0.3',
  },
  {
    path: '/terminos-y-condiciones',
    title: 'Términos y condiciones | Grither',
    description: 'Condiciones de uso del sitio y de la prestación de servicios de desarrollo web de Grither.',
    h1: 'Términos y condiciones',
    intro: 'Condiciones de uso del sitio y de los servicios de Grither.',
    schemaType: 'WebPage',
    changefreq: 'yearly',
    priority: '0.3',
  },
  {
    path: '/politica-de-cookies',
    title: 'Política de cookies | Grither',
    description: 'Información sobre las cookies y el almacenamiento local que usa la web de Grither.',
    h1: 'Política de cookies',
    intro: 'Qué almacenamiento local usa este sitio y para qué.',
    schemaType: 'WebPage',
    changefreq: 'yearly',
    priority: '0.3',
  },
];

/* Páginas que NO deben aparecer en Google (login, paneles, 404) */
export const PRIVATE_META = {
  title: 'Grither · Zona privada',
  description: 'Área privada de Grither.',
};

/* Enlaces internos que se escriben en el HTML estático de cada página */
export const INTERNAL_LINKS = [
  { path: '/', label: 'Servicios' },
  { path: '/sobre-nosotros', label: 'Sobre nosotros' },
  { path: '/contacto', label: 'Contacto' },
];

/* Busca los datos SEO de una ruta (o undefined si no es pública) */
export function getPageSeo(path) {
  return PUBLIC_PAGES.find((page) => page.path === path);
}

/* Quita la barra final para que el canonical sea siempre el mismo */
export function normalizeSiteUrl(siteUrl) {
  return (siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

/* URL absoluta de una ruta. "/" → https://dominio.com/ ; "/contacto" → https://dominio.com/contacto */
export function buildUrl(siteUrl, path) {
  let base = normalizeSiteUrl(siteUrl);
  return path === '/' ? `${base}/` : `${base}${path}`;
}

/* Datos estructurados (Schema.org) de la organización: van en todas las páginas */
export function buildOrganizationSchema(siteUrl) {
  let base = normalizeSiteUrl(siteUrl);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfessionalService',
        '@id': `${base}/#organizacion`,
        name: SITE_NAME,
        url: `${base}/`,
        logo: `${base}/logo-512.png`,
        image: `${base}${OG_IMAGE_PATH}`,
        description: 'Desarrollo web a medida: landing pages, sitios web y aplicaciones web en Colombia.',
        areaServed: { '@type': 'Country', name: 'Colombia' },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Dosquebradas',
          addressRegion: 'Risaralda',
          addressCountry: 'CO',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          url: WHATSAPP_URL,
          availableLanguage: 'Spanish',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#sitio`,
        url: `${base}/`,
        name: SITE_NAME,
        inLanguage: 'es-CO',
        publisher: { '@id': `${base}/#organizacion` },
      },
    ],
  };
}

/* Datos estructurados de una página concreta (tipo de página + migas de pan) */
export function buildPageSchema(siteUrl, page) {
  let url = buildUrl(siteUrl, page.path);
  let graph = [
    {
      '@type': page.schemaType,
      '@id': `${url}#pagina`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: 'es-CO',
      isPartOf: { '@id': `${normalizeSiteUrl(siteUrl)}/#sitio` },
      about: { '@id': `${normalizeSiteUrl(siteUrl)}/#organizacion` },
    },
  ];

  // Migas de pan: Inicio > Página (solo en páginas que no son el inicio)
  if (page.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: buildUrl(siteUrl, '/') },
        // Nombre corto: el título sin el sufijo ("Contacto · ..." → "Contacto")
        { '@type': 'ListItem', position: 2, name: page.title.split(/ [·|] /)[0], item: url },
      ],
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
