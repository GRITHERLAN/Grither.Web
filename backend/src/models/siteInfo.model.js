/* ==========================================================================
   MODELO: INFORMACIÓN DEL SITIO (contact_info, about_info, indicators)
   --------------------------------------------------------------------------
   Traduce las filas de la BD (snake_case) a los objetos que usa el frontend
   (camelCase). Son exactamente los mismos objetos que armaba antes
   frontend/src/services/siteInfoService.js, así la interfaz no cambia.
   ========================================================================== */

/* Secciones de la tabla indicators (valores del CHECK de la columna section) */
export const INDICATOR_SECTIONS = {
  CONTACT: 'contacto',
  ABOUT: 'nosotros',
};

/* Estructuras en blanco: solo se usan si la tabla está vacía, para que la web
   no se caiga y el admin pueda abrir el editor y llenar la información. */
const EMPTY_CONTACT_INFO = {
  email: '',
  phone: '',
  city: '',
  brandDescription: '',
  instagram: '',
  linkedin: '',
  portfolio: '',
};

const EMPTY_ABOUT_INFO = {
  brandDescription: '',
  owner: { name: '', role: '', bio: '', photo: '' },
  phases: { reunion: '', bocetos: '', desarrollo: '', despliegue: '' },
};

/** Fila de contact_info + sus indicadores -> objeto de contacto */
export function toContactInfo(row, indicators) {
  if (!row) return { ...EMPTY_CONTACT_INFO, indicators };
  return {
    email: row.email,
    phone: row.phone,
    city: row.city ?? '',
    brandDescription: row.brand_description,
    instagram: row.instagram,
    linkedin: row.linkedin,
    portfolio: row.portfolio,
    indicators,
  };
}

/** Datos limpios de contacto -> fila de contact_info (siempre id = 1, hay una sola) */
export function toContactRow(data) {
  return {
    id: 1,
    email: data.email,
    phone: data.phone,
    city: data.city,
    brand_description: data.brandDescription,
    instagram: data.instagram,
    linkedin: data.linkedin,
    portfolio: data.portfolio,
    updated_at: new Date().toISOString(),
  };
}

/** Fila de about_info + sus indicadores -> objeto de "Sobre mí" */
export function toAboutInfo(row, indicators) {
  if (!row) return { ...EMPTY_ABOUT_INFO, indicators };
  return {
    brandDescription: row.brand_description,
    indicators,
    owner: {
      name: row.owner_name,
      role: row.owner_role,
      bio: row.owner_bio,
      photo: row.owner_photo_url,
    },
    phases: {
      reunion: row.phase_reunion,
      bocetos: row.phase_bocetos,
      desarrollo: row.phase_desarrollo,
      despliegue: row.phase_despliegue,
    },
  };
}

/** Datos limpios de "Sobre mí" -> fila de about_info (siempre id = 1) */
export function toAboutRow(data) {
  return {
    id: 1,
    brand_description: data.brandDescription,
    owner_name: data.owner.name,
    owner_role: data.owner.role,
    owner_bio: data.owner.bio,
    owner_photo_url: data.owner.photo,
    phase_reunion: data.phases.reunion,
    phase_bocetos: data.phases.bocetos,
    phase_desarrollo: data.phases.desarrollo,
    phase_despliegue: data.phases.despliegue,
    updated_at: new Date().toISOString(),
  };
}
