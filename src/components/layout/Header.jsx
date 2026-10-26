/* ==========================================================================
   CABECERA PRINCIPAL (Header)
   --------------------------------------------------------------------------
   - Logo + nombre "Grither".
   - Navegación: Servicios, Sobre nosotros, Contacto.
   - Pestaña según el rol (solo con sesión iniciada):
       Cliente -> "Proyecto"      Administrador -> "Administrador"
   - Botón Ingresar (sin sesión) o nombre + Salir (con sesión).
   - Interruptor de Modo Oscuro / Claro.
   - En celulares el menú se esconde detrás de un botón hamburguesa.
   ========================================================================== */

import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Logo from './Logo.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import Icon from '../ui/Icon.jsx';
import './Header.css';

/* Enlaces públicos visibles para todos */
const PUBLIC_LINKS = [
  { to: '/', label: 'Servicios' },
  { to: '/sobre-nosotros', label: 'Sobre nosotros' },
  { to: '/contacto', label: 'Contacto' },
];

/** Clase de cada enlace: NavLink nos dice si es la página actual */
function getLinkClass({ isActive }) {
  return `header__link ${isActive ? 'header__link--active' : ''}`;
}

function Header() {
  const { user, isAdmin, isClient, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Cerramos el menú móvil cada vez que se cambia de página
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  function handleToggleMenu(event) {
    event.preventDefault();
    setIsMenuOpen((open) => !open);
  }

  function handleLogout(event) {
    event.preventDefault();
    logout();
    showToast('Cerraste sesión correctamente.', 'info');
    navigate('/');
  }

  // Solo mostramos el primer nombre para que no ocupe mucho espacio
  const firstName = user ? user.name.split(' ')[0] : '';

  return (
    <header className="header">
      <div className="container header__inner">
        <Logo />

        {/* Botón hamburguesa (solo visible en pantallas pequeñas) */}
        <button
          type="button"
          className="header__menu-btn icon-btn"
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isMenuOpen}
          aria-controls="main-menu"
          onClick={handleToggleMenu}
        >
          <Icon name={isMenuOpen ? 'close' : 'menu'} />
        </button>

        <div id="main-menu" className={`header__menu ${isMenuOpen ? 'header__menu--open' : ''}`}>
          <nav aria-label="Navegación principal">
            <ul className="header__links">
              {PUBLIC_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end className={getLinkClass}>
                    {link.label}
                  </NavLink>
                </li>
              ))}

              {/* Pestaña según el rol: solo aparece con sesión iniciada */}
              {isClient && (
                <li>
                  <NavLink to="/proyecto" className={getLinkClass}>
                    Proyecto
                  </NavLink>
                </li>
              )}
              {isAdmin && (
                <li>
                  <NavLink to="/administrador" className={getLinkClass}>
                    Administrador
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>

          <div className="header__actions">
            <ThemeToggle />

            {user ? (
              <div className="header__user">
                <span className="header__user-name" title={user.email}>
                  Hola, {firstName}
                </span>
                <button type="button" className="btn btn--outline btn--sm" onClick={handleLogout}>
                  <Icon name="logout" className="header__logout-icon" />
                  Salir
                </button>
              </div>
            ) : (
              <Link to="/ingresar" className="btn btn--primary btn--sm">
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
