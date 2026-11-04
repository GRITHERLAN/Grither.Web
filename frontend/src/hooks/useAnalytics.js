/* ==========================================================================
   HOOK: useAnalytics
   --------------------------------------------------------------------------
   Envía una vista de página a Google Analytics cada vez que cambia la ruta
   (y cuando el visitante acepta las cookies, para contar la página actual).

   Las rutas privadas (login, panel de cliente y administrador) no se miden.
   ========================================================================== */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CONSENT_EVENT, getConsent, trackPageView } from '../lib/analytics.js';

/* Rutas que nunca se envían a Google */
const PRIVATE_PREFIXES = ['/administrador', '/proyecto', '/ingresar'];

/** Devuelve la decisión actual ('granted' | 'denied' | null) y se actualiza si cambia */
export function useConsent() {
  const [consent, setConsentState] = useState(getConsent);

  useEffect(() => {
    let onChange = (event) => setConsentState(event.detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return consent;
}

export function useAnalytics() {
  const { pathname } = useLocation();
  const consent = useConsent();

  useEffect(() => {
    if (consent !== 'granted') return;
    if (PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    trackPageView(pathname);
  }, [pathname, consent]);
}
