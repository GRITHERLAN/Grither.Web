/* ==========================================================================
   CABECERA PRINCIPAL (Header)
   --------------------------------------------------------------------------
   - Logo + nombre "Grither".
   - Navegación: Servicios, Portafolio, Sobre mí, Contacto.
   - Pestaña según el rol (solo con sesión iniciada):
       Cliente -> "Proyecto"      Administrador -> "Administrador"
   - Botón Ingresar (sin sesión) o nombre + Salir (con sesión).
   - Interruptor de Modo Oscuro / Claro.
   - En celulares el menú se esconde detrás de un botón hamburguesa.
   - Movimiento: una "píldora" verde se desliza bajo el enlace de la página
     actual y sigue al puntero o al foco del teclado; al soltar, vuelve a la
     página actual. Al bajar por la página el header gana una sombra.
   ========================================================================== */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  { to: '/portafolio', label: 'Portafolio' },
  { to: '/sobre-mi', label: 'Sobre mí' },
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

  // Botón hamburguesa: al cerrar el menú con Escape el foco vuelve aquí
  const menuButtonRef = useRef(null);
  // Lista de enlaces: dentro de ella se dibuja la píldora (::before en Header.css)
  const linksRef = useRef(null);
  // ¿Ya bajamos un poco por la página? (para la sombra del header)
  const [isScrolled, setIsScrolled] = useState(false);

  /**
   * Mueve la píldora hasta "link" escribiendo su posición y tamaño en
   * variables CSS de la lista. Si no hay enlace (o está oculto), la esconde.
   * La animación la hace el CSS: una transición de resorte que siempre parte
   * de donde está la píldora en ese momento, así se puede redirigir a mitad
   * de camino sin saltos.
   */
  const movePillTo = useCallback((link) => {
    const list = linksRef.current;
    if (!list) return;

    // offsetWidth = 0 significa que el menú está oculto (celular cerrado)
    if (!link || link.offsetWidth === 0) {
      list.dataset.pill = 'off';
      return;
    }

    list.style.setProperty('--pill-x', `${link.offsetLeft}px`);
    list.style.setProperty('--pill-y', `${link.offsetTop}px`);
    list.style.setProperty('--pill-w', `${link.offsetWidth}px`);
    list.style.setProperty('--pill-h', `${link.offsetHeight}px`);
    list.dataset.pill = 'on';
  }, []);

  /** Devuelve la píldora al enlace de la página actual */
  const movePillToActive = useCallback(() => {
    movePillTo(linksRef.current?.querySelector('.header__link--active'));
  }, [movePillTo]);

  // Al cambiar de página, de sesión o al abrir el menú móvil: píldora a la
  // página actual. useLayoutEffect mide antes de pintar (sin parpadeos).
  useLayoutEffect(() => {
    movePillToActive();

    // La primera vez se coloca sin animar; desde el siguiente fotograma ya
    // se desliza (si no, al cargar volaría desde la esquina)
    const frameId = window.requestAnimationFrame(() => {
      if (linksRef.current) linksRef.current.dataset.pillAnimate = 'on';
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname, isMenuOpen, user, movePillToActive]);

  // Si cambia el tamaño de la ventana, los enlaces se mueven: medimos otra vez
  useEffect(() => {
    window.addEventListener('resize', movePillToActive);
    return () => window.removeEventListener('resize', movePillToActive);
  }, [movePillToActive]);

  // Sombra del header en cuanto la página baja 8px
  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 8);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /** Puntero o foco sobre un enlace: la píldora va hacia él */
  function handleLinkHover(event) {
    const link = event.target.closest('.header__link');
    if (link) movePillTo(link);
  }

  // Cerramos el menú móvil cada vez que se cambia de página
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Accesibilidad: con el menú móvil abierto, la tecla Escape lo cierra y
  // devuelve el foco al botón hamburguesa (para seguir navegando con teclado)
  useEffect(() => {
    if (!isMenuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

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
    <header className="header" data-scrolled={isScrolled}>
      <div className="container header__inner">
        <Logo />

        {/* Botón hamburguesa (solo visible en pantallas pequeñas) */}
        <button
          ref={menuButtonRef}
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
            <ul
              ref={linksRef}
              className="header__links"
              onPointerOver={handleLinkHover}
              onPointerLeave={movePillToActive}
              onFocus={handleLinkHover}
              onBlur={movePillToActive}
            >
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
