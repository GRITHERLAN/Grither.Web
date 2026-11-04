/* ==========================================================================
   HOOK: useResponsible
   --------------------------------------------------------------------------
   Datos del "Responsable del tratamiento" que exigen las páginas legales
   (art. 13 del Decreto 1377 de 2013): nombre, domicilio, correo y teléfono.
     - Nombre:           Sobre mí > Quién está detrás (about_info).
     - Correo, teléfono y ciudad: Contacto (contact_info).
       Si la ciudad aún no se ha guardado, se usa LEGAL_CITY (siteContent.js).
   Así, si el admin cambia su correo o teléfono, las políticas se actualizan solas.

   Uso:
     const { data: responsible, error, reload } = useResponsible();
     responsible -> { name, city, email, phone } (null mientras carga)
   ========================================================================== */

import { useAsyncData } from './useAsyncData.js';
import { getAboutInfo, getContactInfo } from '../services/siteInfoService.js';
import { LEGAL_CITY } from '../data/siteContent.js';

/** Carga en paralelo la información de Nosotros y de Contacto */
async function loadResponsible() {
  const [about, contact] = await Promise.all([getAboutInfo(), getContactInfo()]);
  return {
    name: about.owner.name,
    city: contact.city || LEGAL_CITY,
    email: contact.email,
    phone: contact.phone,
  };
}

export function useResponsible() {
  return useAsyncData(loadResponsible, []);
}
