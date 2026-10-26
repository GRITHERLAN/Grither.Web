/* ==========================================================================
   PLANTILLA DE LAS PÁGINAS PÚBLICAS Y DEL PANEL DE USUARIO
   --------------------------------------------------------------------------
   Header arriba, contenido de la página en el medio (<Outlet />),
   Footer abajo y el botón fijo de WhatsApp.
   ========================================================================== */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import WhatsAppButton from './WhatsAppButton.jsx';

function PublicLayout() {
  const { pathname } = useLocation();

  // Al cambiar de página volvemos al inicio de la pantalla
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Header />
      <main className="page">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}

export default PublicLayout;
