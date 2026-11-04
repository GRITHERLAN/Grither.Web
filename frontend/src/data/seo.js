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
      'Soy Grither, desarrollador web freelance. Creo landing pages, sitios web y aplicaciones a la medida para negocios en Colombia. Cotiza hoy.',
    h1: 'Construyo la web que tu negocio necesita para crecer.',
    intro:
      'Desarrollo web freelance en Colombia: landing pages, sitios web, aplicaciones web y soporte, desde la reunión inicial hasta el despliegue.',
    sections: [
      {
        h2: 'Qué hago',
        paragraphs: [
          'Soy Grither, desarrollador web freelance en Dosquebradas, Risaralda, y atiendo a negocios y emprendedores de toda Colombia. Si buscas crear una página web en Pereira, Dosquebradas o en cualquier ciudad del país, trabajo contigo desde la idea hasta que tu sitio está publicado y funcionando.',
          'Diseño y programo landing pages para captar clientes, sitios web corporativos que presentan tu marca, aplicaciones web y plataformas SaaS a la medida, además de soporte y mantenimiento para las webs que ya tienes en línea.',
        ],
      },
      {
        h2: 'Landing pages, sitios web y aplicaciones web',
        paragraphs: [
          'Una landing page es una página enfocada en una sola acción: que te escriban, te llamen o compren. Un sitio web reúne tus servicios, tu historia y tus datos de contacto en varias páginas. Una aplicación web resuelve un proceso de tu negocio, como reservas, inventarios o paneles de seguimiento para tus clientes.',
          'Todos los proyectos se construyen con tecnologías modernas como React, JavaScript, Supabase y Vercel, son responsive (se ven bien en celular, tableta y computador) y están pensados para cargar rápido y posicionar en Google.',
        ],
      },
      {
        h2: 'Cómo trabajo',
        paragraphs: [
          'El proceso tiene cuatro fases: reunión inicial para entender tu negocio, bocetos y prototipos para validar el diseño, desarrollo del sitio y despliegue en internet. Cada cliente cuenta con un panel privado para ver en qué fase va su proyecto, con imágenes, descripción y categoría.',
          'Los precios dependen del alcance de cada proyecto. Escríbeme por WhatsApp o desde la página de contacto y te respondo con una propuesta clara para tu negocio en Colombia.',
        ],
      },
    ],
    externalLinks: [{ href: WHATSAPP_URL, label: 'Escríbeme por WhatsApp' }],
    schemaType: 'WebPage',
    changefreq: 'monthly',
    priority: '1.0',
  },
  {
    path: '/portafolio',
    title: 'Portafolio · Proyectos web que he desarrollado | Grither',
    description:
      'Mira sitios web, tiendas online y aplicaciones a medida que he desarrollado como freelancer en Colombia. Conoce el stack de cada proyecto.',
    h1: 'Proyectos que ya levantaron vuelo.',
    intro:
      'Una selección de sitios, tiendas online y sistemas a medida construidos con Grither, con la tecnología usada en cada uno.',
    sections: [
      {
        h2: 'Trabajos de desarrollo web',
        paragraphs: [
          'En este portafolio reúno landing pages, sitios web, tiendas online y aplicaciones web a la medida. Cada proyecto indica su categoría, el stack con el que se construyó y si es un proyecto real de un cliente o una demostración.',
        ],
      },
    ],
    externalLinks: [{ href: WHATSAPP_URL, label: 'Escríbeme por WhatsApp' }],
    schemaType: 'CollectionPage',
    changefreq: 'weekly',
    priority: '0.9',
  },
  {
    path: '/sobre-mi',
    title: 'Sobre mí · Quién es Grither y cómo trabajo',
    description:
      'Conoce quién soy, las tecnologías que uso y mi proceso de trabajo como desarrollador web freelance: reunión, bocetos, desarrollo y despliegue.',
    h1: 'Le doy alas a las ideas digitales.',
    intro:
      'Conoce al desarrollador detrás de Grither y las cuatro fases con las que convierto tu idea en una web publicada.',
    sections: [
      {
        h2: 'Mi proceso',
        paragraphs: [
          'Trabajo en cuatro fases: reunión para definir objetivos y alcance, bocetos y prototipos para aprobar el diseño antes de programar, desarrollo con entregas por etapa y despliegue para publicar tu web en internet.',
        ],
      },
      {
        h2: 'Quién soy',
        paragraphs: [
          'Soy Grither, desarrollador web freelance con base en Dosquebradas, Risaralda. Trabajo con HTML, CSS, JavaScript, React, Node.js, Supabase y Vercel, y apoyo mi flujo de trabajo con inteligencia artificial para entregar más rápido sin perder calidad.',
        ],
      },
    ],
    externalLinks: [{ href: WHATSAPP_URL, label: 'Escríbeme por WhatsApp' }],
    schemaType: 'AboutPage',
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    path: '/contacto',
    title: 'Contacto · Cuéntame tu proyecto web | Grither',
    description:
      'Escríbeme para cotizar tu página web o aplicación. Contacto por correo, WhatsApp y redes sociales. Respondo rápido.',
    h1: 'Cuéntame tu idea. Te respondo hoy.',
    intro: 'Cuéntame qué necesitas y te respondo con una propuesta para tu proyecto web.',
    sections: [
      {
        h2: 'Cotiza tu página web',
        paragraphs: [
          'Cuéntame qué necesitas: una landing page, un sitio web, una aplicación web o soporte para tu web actual. Puedes escribirme por correo, por WhatsApp o desde el formulario de esta página, y te respondo con una propuesta para tu proyecto.',
        ],
      },
    ],
    externalLinks: [{ href: WHATSAPP_URL, label: 'Escríbeme por WhatsApp' }],
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
  { path: '/portafolio', label: 'Portafolio' },
  { path: '/sobre-mi', label: 'Sobre mí' },
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
