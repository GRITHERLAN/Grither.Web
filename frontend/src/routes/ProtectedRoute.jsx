/* ==========================================================================
   RUTA PROTEGIDA POR ROL
   --------------------------------------------------------------------------
   Envuelve las páginas privadas:
     - Revisando la sesión -> muestra "Verificando sesión..." (espera).
     - Sin sesión          -> lleva a /ingresar (y recuerda a dónde quería ir).
     - Rol no permitido    -> lleva al inicio.
     - Rol permitido       -> muestra la página.
   ========================================================================== */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';

/**
 * @param {string[]} allowedRoles - Roles que pueden entrar (ej. ['admin']).
 * @param {ReactNode} children - Página a proteger (si no se pasa, usa <Outlet />).
 */
function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Todavía no sabemos si hay sesión: esperamos en vez de redirigir
  if (loading) {
    return <LoadingState label="Verificando sesión..." />;
  }

  if (!user) {
    // "state.from" permite volver a esta página después de iniciar sesión
    return <Navigate to="/ingresar" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
}

export default ProtectedRoute;
