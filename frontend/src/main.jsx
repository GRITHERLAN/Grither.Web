/* ==========================================================================
   PUNTO DE ENTRADA DE LA APLICACIÓN
   --------------------------------------------------------------------------
   1. Importa los estilos globales (orden: variables -> base -> utilidades).
   2. Borra los datos viejos de LocalStorage (ahora todo vive en Supabase).
   3. Monta React dentro de <div id="root">.
   ========================================================================== */

// Los estilos globales van PRIMERO para que el CSS de cada componente
// (que se importa dentro de App) pueda sobrescribirlos.
import './styles/variables.css';
import './styles/base.css';
import './styles/utilities.css';
import './styles/motion.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { removeLegacyData } from './utils/themeStorage.js';

// Los datos de prueba ya están en Supabase: solo limpiamos lo que dejó la
// versión anterior en el navegador (usuarios, proyectos, sesión vieja...)
removeLegacyData();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* future: activa ya el comportamiento de React Router v7 (evita avisos en consola) */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
