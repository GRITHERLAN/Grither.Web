/* ==========================================================================
   INTERRUPTOR (TOGGLE SWITCH) MODO OSCURO / CLARO
   --------------------------------------------------------------------------
   Es un <button role="switch">: los lectores de pantalla lo anuncian como
   interruptor y aria-checked indica si el modo oscuro está encendido.
   ========================================================================== */

import { useTheme } from '../../context/ThemeContext.jsx';
import Icon from '../ui/Icon.jsx';
import './ThemeToggle.css';

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  function handleClick(event) {
    event.preventDefault();
    toggleTheme();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo oscuro' : 'Modo claro'}
      className="theme-toggle"
      onClick={handleClick}
    >
      {/* Iconos fijos a cada lado y una bolita que se desliza encima */}
      <span className="theme-toggle__icon theme-toggle__icon--sun">
        <Icon name="sun" />
      </span>
      <span className="theme-toggle__icon theme-toggle__icon--moon">
        <Icon name="moon" />
      </span>
      <span className="theme-toggle__thumb" />
    </button>
  );
}

export default ThemeToggle;
