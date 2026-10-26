/* ==========================================================================
   PIE DE PÁGINA (Footer)
   ========================================================================== */

import './Footer.css';

function Footer() {
  // El año se calcula solo, así nunca queda desactualizado
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p>© {currentYear} Grither · Desarrollo web</p>
        <p className="footer__made text-mono">Hecho en Colombia</p>
      </div>
    </footer>
  );
}

export default Footer;
