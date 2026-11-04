/* ==========================================================================
   GOOGLE ANALYTICS 4 (con consentimiento del visitante)
   --------------------------------------------------------------------------
   Google Analytics NO se carga hasta que el visitante pulsa "Aceptar" en el
   banner de cookies (Ley 1581 de 2012). Si rechaza, no se descarga ningún
   script de Google ni se envía ningún dato.

   La decisión se guarda en localStorage con la clave "grither_analytics_consent"
   ('granted' | 'denied'). Si no existe, el banner se muestra.

   La web es una SPA: Google solo detecta la primera carga, así que cada cambio
   de ruta se envía a mano como evento "page_view" (ver hooks/useAnalytics.js).
   ========================================================================== */

/* ID de medición de GA4 (es público: va en el código de cualquier web) */
const GA_ID = 'G-FLDQJ162PC';

const CONSENT_KEY = 'grither_analytics_consent';

/* Evento propio para avisar a los componentes cuando cambia la decisión */
export const CONSENT_EVENT = 'grither:consent-change';

/* Evita descargar gtag.js dos veces */
let isLoaded = false;

/** Lee la decisión guardada: 'granted', 'denied' o null si aún no eligió */
export function getConsent() {
  try {
    let value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null; // almacenamiento bloqueado: se tratará como "sin decisión"
  }
}

/** Borra las cookies _ga y _ga_* (Google las puede poner en el dominio y en el dominio padre) */
function deleteAnalyticsCookies() {
  let parts = window.location.hostname.split('.');
  let domains = [window.location.hostname];
  if (parts.length > 2) domains.push(parts.slice(-2).join('.')); // ej. www.sitio.com -> sitio.com

  document.cookie.split(';').forEach((cookie) => {
    let name = cookie.split('=')[0].trim();
    if (name !== '_ga' && !name.startsWith('_ga_')) return;

    domains.forEach((domain) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
    });
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

/** Guarda la decisión y avisa a quien esté escuchando */
export function setConsent(value) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Si no se puede guardar, la decisión vale solo para esta visita
  }

  // Si rechaza (o cambia de opinión), Google deja de enviar datos de inmediato
  window[`ga-disable-${GA_ID}`] = value !== 'granted';

  // Al rechazar también se borran las cookies de Google que ya estaban puestas
  if (value !== 'granted') deleteAnalyticsCookies();

  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** Descarga gtag.js y lo configura. Solo se ejecuta una vez y solo con permiso. */
function loadAnalytics() {
  if (isLoaded) return;
  isLoaded = true;

  window[`ga-disable-${GA_ID}`] = false;
  window.dataLayer = window.dataLayer || [];

  // gtag necesita recibir el objeto "arguments" tal cual (no un array)
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  // send_page_view: false -> los page_view los enviamos nosotros en cada ruta
  window.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true });

  let script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

/** Envía una vista de página. No hace nada si el visitante no aceptó. */
export function trackPageView(path) {
  if (getConsent() !== 'granted') return;

  loadAnalytics();
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
