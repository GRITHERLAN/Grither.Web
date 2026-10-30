/* ==========================================================================
   LOGO DE GRITHER
   --------------------------------------------------------------------------
   Cambia el archivo según el tema (todos son SVG de la carpeta NewLogo):
     - Modo Oscuro -> versión neón (líneas verdes y lima con brillo).
     - Modo Claro  -> versión "tinta neón" (líneas negras y verdes, pensada
                      para fondo blanco).
   Variantes:
     - "brand":  emblema pequeño + nombre "Grither" con la letra del logo.
     - "emblem": solo el emblema grande (Sobre mí, tarjetas y carrusel vacío).
   ========================================================================== */

import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
// Emblema sin nombre (viewBox recortado al dibujo, sin márgenes vacíos)
import emblemDark from '../../assets/logos/grither-emblema.svg';
import emblemLight from '../../assets/logos/grither-emblema-claro.svg';
// Mismo emblema con trazos más gruesos: a tamaño de ícono (header) las líneas
// originales medirían menos de 1 px y casi no se verían
import iconDark from '../../assets/logos/grither-icono.svg';
import iconLight from '../../assets/logos/grither-icono-claro.svg';
import './Logo.css';

/**
 * @param {'brand'|'emblem'} variant
 * @param {string} subtitle - Texto pequeño bajo el nombre (ej. "Panel admin").
 * @param {string} to - Ruta a la que lleva al hacer clic (solo en "brand").
 */
function Logo({ variant = 'brand', subtitle = '', to = '/' }) {
  const { isDark } = useTheme();

  // Solo el emblema grande
  if (variant === 'emblem') {
    // width/height reservan el espacio antes de cargar (evita saltos de diseño);
    // el tamaño real lo controla el CSS. Proporción del SVG: ~880 × 610.
    return (
      <img
        className="logo-emblem"
        src={isDark ? emblemDark : emblemLight}
        alt="Emblema de Grither"
        width="400"
        height="277"
        decoding="async"
      />
    );
  }

  // Emblema + nombre (enlace a la página de inicio)
  return (
    <Link to={to} className="logo" aria-label="Grither, ir al inicio">
      <img className="logo__image" src={isDark ? iconDark : iconLight} alt="" width="400" height="280" decoding="async" />
      <span className="logo__text">
        <span className="logo__name">Grither</span>
        {subtitle && <span className="logo__subtitle">{subtitle}</span>}
      </span>
    </Link>
  );
}

export default Logo;
