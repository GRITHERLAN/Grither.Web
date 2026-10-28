/* ==========================================================================
   BANNER DE COOKIES (consentimiento de analítica)
   --------------------------------------------------------------------------
   Se muestra mientras el visitante no haya decidido. "Aceptar" activa Google
   Analytics; "Rechazar" lo deja apagado. Puede cambiar la decisión después
   desde la Política de cookies.
   ========================================================================== */

import { Link } from 'react-router-dom';
import { setConsent } from '../../lib/analytics.js';
import { useConsent } from '../../hooks/useAnalytics.js';
import { LEGAL_ROUTES } from '../../data/siteContent.js';
import './CookieBanner.css';

function CookieBanner() {
  const consent = useConsent();

  // Ya decidió: no se muestra
  if (consent) return null;

  return (
    <section className="cookie-banner" aria-label="Aviso de cookies">
      <p className="cookie-banner__text">
        Usamos Google Analytics para entender cómo se usa la web y mejorarla. Solo se activa si aceptas.{' '}
        <Link to={LEGAL_ROUTES.COOKIES}>Más información</Link>
      </p>
      <div className="cookie-banner__actions">
        <button type="button" className="btn btn--outline btn--sm" onClick={() => setConsent('denied')}>
          Rechazar
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setConsent('granted')}>
          Aceptar
        </button>
      </div>
    </section>
  );
}

export default CookieBanner;
