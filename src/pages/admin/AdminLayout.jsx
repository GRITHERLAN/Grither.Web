/* ==========================================================================
   PLANTILLA DEL PANEL ADMINISTRADOR
   --------------------------------------------------------------------------
   Barra lateral (como en el diseño) con:
     - Logo + "Panel admin".
     - Menú: Proyectos (desplegable: Pendientes / Terminados), Servicios y planes, Contacto, Sobre mí, Usuarios.
     - Abajo: volver al sitio, cambio de tema y tarjeta del admin con Salir.
   El contenido de cada sección se pinta en <Outlet />.
   En celulares la barra lateral pasa a ser una barra superior con un menú hamburguesa.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Logo from '../../components/layout/Logo.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { getInitials } from '../../utils/format.js';
import './AdminLayout.css';

/* Opciones del menú lateral */
const PROJECT_LINKS = [
  { to: '/administrador', label: 'Pendientes', end: true },
  { to: '/administrador/terminados', label: 'Terminados' },
];

const ADMIN_LINKS = [
  { to: '/administrador/servicios', label: 'Servicios y planes', icon: 'layout' },
  { to: '/administrador/contacto', label: 'Contacto', icon: 'mail' },
  { to: '/administrador/nosotros', label: 'Sobre mí', icon: 'user' },
  { to: '/administrador/usuarios', label: 'Usuarios', icon: 'users' },
];

function AdminLayout() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ¿Estamos dentro de Proyectos (Pendientes o Terminados)?
  const isInProjects = pathname === '/administrador' || pathname === '/administrador/terminados';

  // Estado del menú desplegable "Proyectos" (abierto por defecto si estamos dentro)
  const [isProjectsOpen, setIsProjectsOpen] = useState(isInProjects);

  // Al cambiar de sección volvemos arriba y, si entramos a Proyectos, se despliega
  useEffect(() => {
    window.scrollTo(0, 0);
    if (isInProjects) setIsProjectsOpen(true);
  }, [pathname, isInProjects]);

  // Menú hamburguesa (solo se usa en celular/tablet)
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Botón hamburguesa: al cerrar con Escape el foco vuelve aquí
  const menuButtonRef = useRef(null);

  // Al cambiar de sección se cierra el menú móvil
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Accesibilidad: con el menú abierto, Escape lo cierra y devuelve el foco al botón
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

  function handleToggleProjects(event) {
    event.preventDefault();
    setIsProjectsOpen((current) => !current);
  }

  function handleLogout(event) {
    event.preventDefault();
    logout();
    showToast('Cerraste sesión correctamente.', 'info');
    navigate('/');
  }

  return (
    <div className="admin">
      <aside className="admin__sidebar">
        {/* Barra superior: logo + botón hamburguesa (el botón solo se ve en celular) */}
        <div className="admin__topbar">
          <Logo subtitle="Panel admin" to="/administrador" />
          <button
            ref={menuButtonRef}
            type="button"
            className="admin__menu-btn icon-btn"
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isMenuOpen}
            aria-controls="admin-menu"
            onClick={handleToggleMenu}
          >
            <Icon name={isMenuOpen ? 'close' : 'menu'} />
          </button>
        </div>

        {/* Menú: en escritorio siempre visible; en celular se despliega con la hamburguesa */}
        <div id="admin-menu" className={`admin__menu ${isMenuOpen ? 'admin__menu--open' : ''}`}>
        <nav className="admin__nav" aria-label="Menú del administrador">
          <p className="admin__nav-title text-mono">Gestión</p>
          <ul className="admin__nav-list">
            {/* Proyectos: menú desplegable con Pendientes y Terminados */}
            <li>
              <button
                type="button"
                className={`admin__link admin__link--group ${isInProjects ? 'admin__link--active' : ''}`}
                aria-expanded={isProjectsOpen}
                aria-controls="admin-projects-submenu"
                onClick={handleToggleProjects}
              >
                <Icon name="grid" />
                Proyectos
                <Icon name="chevronDown" className={`admin__chevron ${isProjectsOpen ? 'admin__chevron--open' : ''}`} />
              </button>
              {isProjectsOpen && (
                <ul id="admin-projects-submenu" className="admin__sublist">
                  {PROJECT_LINKS.map((link) => (
                    <li key={link.to}>
                      <NavLink
                        to={link.to}
                        end={link.end}
                        className={({ isActive }) => `admin__sublink ${isActive ? 'admin__sublink--active' : ''}`}
                      >
                        {link.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            {ADMIN_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `admin__link ${isActive ? 'admin__link--active' : ''}`}
                >
                  <Icon name={link.icon} />
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="admin__sidebar-bottom">
          <div className="admin__sidebar-tools">
            <Link to="/" className="admin__site-link">
              <Icon name="home" /> Ver sitio
            </Link>
            <ThemeToggle />
          </div>

          <div className="admin__user">
            <span className="admin__avatar" aria-hidden="true">
              {getInitials(user.name)}
            </span>
            <span className="admin__user-info">
              <span className="admin__user-name">{user.name}</span>
              <span className="admin__user-role">Administrador</span>
            </span>
            <button type="button" className="icon-btn" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={handleLogout}>
              <Icon name="logout" />
            </button>
          </div>
        </div>
        </div>
      </aside>

      <main className="admin__content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
