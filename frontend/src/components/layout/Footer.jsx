/* ==========================================================================
   PIE DE PÁGINA (Footer)
   --------------------------------------------------------------------------
   Muestra el año, el lugar y los enlaces a las páginas legales (Política de
   privacidad, Términos y Política de cookies). La ley exige que la política
   de datos esté "puesta en conocimiento" de los usuarios: por eso va en el
   pie de TODAS las páginas públicas.
   ========================================================================== */

import { Link } from 'react-router-dom';
import { LEGAL_ROUTES } from '../../data/siteContent.js';
import './Footer.css';

/* Páginas principales del sitio */
const MAIN_LINKS = [
  { to: '/', label: 'Servicios' },
  { to: '/portafolio', label: 'Portafolio' },
  { to: '/sobre-mi', label: 'Sobre mí' },
  { to: '/contacto', label: 'Contacto' },
];

/* Enlaces legales en el orden en que se muestran */
const LEGAL_LINKS = [
  { to: LEGAL_ROUTES.PRIVACY, label: 'Política de privacidad' },
  { to: LEGAL_ROUTES.TERMS, label: 'Términos y condiciones' },
  { to: LEGAL_ROUTES.COOKIES, label: 'Política de cookies' },
];

function Footer() {
  // El año se calcula solo, así nunca queda desactualizado
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p>© {currentYear} Grither · Desarrollo web</p>

        {/* Enlaces internos a las páginas principales (ayudan a Google a descubrirlas) */}
        <nav aria-label="Páginas principales">
          <ul className="footer__links">
            {MAIN_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="footer__link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Información legal">
          <ul className="footer__links">
            {LEGAL_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="footer__link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="footer__made text-mono">Hecho en Colombia</p>
      </div>
    </footer>
  );
}

export default Footer;
