/* ==========================================================================
   LOGO DE GRITHER
   --------------------------------------------------------------------------
   Cambia la imagen según el tema:
     - Modo Oscuro -> Logo__Grither__Oscuro__Vectorial (neón cian/magenta)
     - Modo Claro  -> Logo__Grither__Blanco__Vectorial (negro/morado)
   Variantes:
     - "brand":  icono pequeño en caja + nombre "Grither" en degradado.
     - "emblem": solo el emblema grande (para héroes y carrusel vacío).
   ========================================================================== */

import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import logoDark from '../../assets/logos/logo-oscuro.png';
import logoLight from '../../assets/logos/logo-claro.png';
import './Logo.css';

/**
 * @param {'brand'|'emblem'} variant
 * @param {string} subtitle - Texto pequeño bajo el nombre (ej. "Panel admin").
 * @param {string} to - Ruta a la que lleva al hacer clic (solo en "brand").
 */
function Logo({ variant = 'brand', subtitle = '', to = '/' }) {
  const { isDark } = useTheme();
  const logoSrc = isDark ? logoDark : logoLight;

  // Solo el emblema grande
  if (variant === 'emblem') {
    return <img className="logo-emblem" src={logoSrc} alt="Emblema de Grither" />;
  }

  // Icono + nombre (enlace a la página de inicio)
  return (
    <Link to={to} className="logo" aria-label="Grither, ir al inicio">
      <img className="logo__image" src={logoSrc} alt="" />
      <span className="logo__text">
        <span className="logo__name">Grither</span>
        {subtitle && <span className="logo__subtitle">{subtitle}</span>}
      </span>
    </Link>
  );
}

export default Logo;
