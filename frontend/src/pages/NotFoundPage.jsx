/* ==========================================================================
   PÁGINA 404: la ruta no existe
   ========================================================================== */

import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="container">
      <div className="empty-state">
        <p className="eyebrow">Error 404</p>
        <h1 className="empty-state__title">Esta página no existe</h1>
        <p>Revisa la dirección o vuelve al inicio.</p>
        <Link to="/" className="btn btn--primary btn--sm">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
