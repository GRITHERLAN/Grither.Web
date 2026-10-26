/* ==========================================================================
   PUNTO DE ENTRADA DE LA APLICACIÓN
   --------------------------------------------------------------------------
   1. Importa los estilos globales (orden: variables -> base -> utilidades).
   2. Guarda los datos de prueba en LocalStorage si aún no existen.
   3. Monta React dentro de <div id="root">.
   ========================================================================== */

// Los estilos globales van PRIMERO para que el CSS de cada componente
// (que se importa dentro de App) pueda sobrescribirlos.
import './styles/variables.css';
import './styles/base.css';
import './styles/utilities.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { seedDatabase } from './data/seed.js';

const rootElement = document.getElementById('root');

/** Monta la aplicación de React */
function renderApp() {
  createRoot(rootElement).render(
    <StrictMode>
      {/* future: activa ya el comportamiento de React Router v7 (evita avisos en consola) */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
}

// Primero sembramos los datos (es async por el hash de contraseñas) y luego
// mostramos la app. Si algo falla, igual mostramos la app.
seedDatabase().catch(() => {}).finally(renderApp);
