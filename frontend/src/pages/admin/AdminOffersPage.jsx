/* ==========================================================================
   PANEL ADMIN: SERVICIOS Y PLANES
   --------------------------------------------------------------------------
   Edición de las cards de la página Servicios:
     - "Qué hago": servicios (título, descripción, icono, etiquetas).
     - "Planes": nombre, precio COP, descripción, características, botón.
   Cada bloque se guarda por separado y se puede agregar o quitar cards.
   ========================================================================== */

import { Link } from 'react-router-dom';
import ServicesEditor from '../../components/admin/ServicesEditor.jsx';
import PlansEditor from '../../components/admin/PlansEditor.jsx';

function AdminOffersPage() {
  return (
    <>
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">Servicios y planes</h1>
          <p className="admin-header__text">Edita las cards que se muestran en la página Servicios.</p>
        </div>
        <Link to="/" className="btn btn--outline">
          Ver página
        </Link>
      </header>

      <div className="admin-offers">
        <ServicesEditor />
        <PlansEditor />
      </div>
    </>
  );
}

export default AdminOffersPage;
