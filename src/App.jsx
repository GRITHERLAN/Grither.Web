/* ==========================================================================
   COMPONENTE RAÍZ: PROVEEDORES Y RUTAS
   --------------------------------------------------------------------------
   Mapa de rutas de la web:
     /                       Servicios (inicio)
     /sobre-nosotros         Sobre nosotros
     /contacto               Contacto
     /ingresar               Inicio de sesión
     /proyecto               Panel Usuario (solo clientes)
     /proyecto/:projectId    Ver avance (cliente dueño o admin)
     /administrador          Panel Admin: proyectos pendientes
     /administrador/terminados Panel Admin: proyectos terminados
     /administrador/servicios Panel Admin: cards de Servicios y Planes
     /administrador/contacto Panel Admin: información de contacto
     /administrador/nosotros Panel Admin: información de Sobre nosotros
     /administrador/usuarios Panel Admin: usuarios registrados
   ========================================================================== */

import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ROLES } from './services/authService.js';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import UserProjectsPage from './pages/UserProjectsPage.jsx';
import ProjectProgressPage from './pages/ProjectProgressPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminProjectsPage from './pages/admin/AdminProjectsPage.jsx';
import AdminOffersPage from './pages/admin/AdminOffersPage.jsx';
import AdminContactPage from './pages/admin/AdminContactPage.jsx';
import AdminAboutPage from './pages/admin/AdminAboutPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* ---------- Páginas con Header, Footer y WhatsApp ---------- */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<ServicesPage />} />
              <Route path="/sobre-nosotros" element={<AboutPage />} />
              <Route path="/contacto" element={<ContactPage />} />

              {/* Panel Usuario: solo clientes */}
              <Route
                path="/proyecto"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.USER]}>
                    <UserProjectsPage />
                  </ProtectedRoute>
                }
              />

              {/* Ver avance: cliente dueño o administrador */}
              <Route
                path="/proyecto/:projectId"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.USER, ROLES.ADMIN]}>
                    <ProjectProgressPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* ---------- Inicio de sesión (diseño propio a pantalla completa) ---------- */}
            <Route path="/ingresar" element={<AuthPage />} />

            {/* ---------- Panel Administrador (con barra lateral) ---------- */}
            <Route
              path="/administrador"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              {/* "key" hace que cada sección empiece con sus propios filtros */}
              <Route index element={<AdminProjectsPage key="pendientes" />} />
              <Route path="terminados" element={<AdminProjectsPage key="terminados" isCompletedList />} />
              <Route path="servicios" element={<AdminOffersPage />} />
              <Route path="contacto" element={<AdminContactPage />} />
              <Route path="nosotros" element={<AdminAboutPage />} />
              <Route path="usuarios" element={<AdminUsersPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
