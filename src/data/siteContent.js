/* ==========================================================================
   CONTENIDO FIJO DE LA WEB
   --------------------------------------------------------------------------
   Textos que no se editan desde el panel admin.
   (Las cards de "Qué hago" y "Planes" son editables: viven en Supabase
   y se gestionan en services/offerService.js)
   ========================================================================== */

/* Tecnologías que se muestran en Sobre mí */
export const TECHNOLOGIES = ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Express', 'Supabase', 'Netlify', 'Vercel',
  'PHP', 'Angular', 'IA Generativa', 'SDD', 'IA Agentica', 'Git'];

/* Opciones del formulario de contacto */
export const CONTACT_NEEDS = ['Landing page', 'Sitio web', 'Web app / SaaS', 'Soporte y/o mantenimiento', 'Web a la medida'];

export const BUDGET_OPTIONS = [
  'Aún no lo sé',
  'Menos de $ 2.000.000',
  '$ 2.000.000 a $ 5.000.000',
  '$ 5.000.000 a $ 10.000.000',
  'Más de $ 10.000.000',
];

/* --------------------------------------------------------------------------
   Datos legales (Política de privacidad, Términos y Política de cookies)
   --------------------------------------------------------------------------
   El nombre del Responsable se lee de "Sobre mí" (Quién está detrás) y
   el correo, el teléfono y la ciudad de "Contacto", así se mantienen al día
   desde el panel Administrador.
   -------------------------------------------------------------------------- */

/* Domicilio del Responsable: solo se usa si la ciudad de Contacto está vacía */
export const LEGAL_CITY = 'Dosquebradas, Risaralda, Colombia';

/* Fecha en que entran en vigencia las políticas (cambiarla si se modifican) */
export const LEGAL_UPDATED_AT = '28 de octubre de 2026';

/* Rutas de las páginas legales (se usan en el Footer, Contacto y las rutas) */
export const LEGAL_ROUTES = {
  PRIVACY: '/politica-de-privacidad',
  TERMS: '/terminos-y-condiciones',
  COOKIES: '/politica-de-cookies',
};
