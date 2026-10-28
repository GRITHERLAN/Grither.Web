/* ==========================================================================
   PLANTILLA DE LAS PÁGINAS PÚBLICAS Y DEL PANEL DE USUARIO
   --------------------------------------------------------------------------
   Enlace "Saltar al contenido", Header arriba, contenido de la página en
   el medio (<Outlet />), Footer abajo y el botón fijo de WhatsApp.
   ========================================================================== */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import WhatsAppButton from './WhatsAppButton.jsx';
import CookieBanner from './CookieBanner.jsx';

function PublicLayout() {
  const { pathname } = useLocation();

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
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieBanner />
    </>
  );
}

export default PublicLayout;
