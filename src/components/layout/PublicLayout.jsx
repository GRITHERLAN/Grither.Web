/* ==========================================================================
   PLANTILLA DE LAS PÁGINAS PÚBLICAS Y DEL PANEL DE USUARIO
   --------------------------------------------------------------------------
   Enlace "Saltar al contenido", Header arriba, contenido de la página en
   el medio (<Outlet />), Footer abajo y el botón fijo de WhatsApp.
   También activa el movimiento del sitio público (usePublicMotion).
   ========================================================================== */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import WhatsAppButton from './WhatsAppButton.jsx';
import CookieBanner from './CookieBanner.jsx';
import { usePublicMotion } from '../../hooks/usePublicMotion.js';

function PublicLayout() {
  const { pathname } = useLocation();

  // Aparición al hacer scroll, foco neón en tarjetas y demás animaciones
  usePublicMotion();

  // Al cambiar de página volvemos al inicio de la pantalla
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      {/* Accesibilidad: primer elemento al pulsar Tab. Salta el menú y va
          directo al contenido (solo se ve cuando recibe el foco). */}
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" className="page" tabIndex={-1}>
        {/* key = ruta: al navegar este contenedor se crea de nuevo y su
            animación de entrada (motion.css) se repite en cada página */}
        <div key={pathname} className="route-view">
          <Outlet />
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieBanner />
    </>
  );
}

export default PublicLayout;
