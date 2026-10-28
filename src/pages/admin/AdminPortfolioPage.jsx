/* ==========================================================================
   PANEL ADMIN: PORTAFOLIO
   --------------------------------------------------------------------------
   CRUD de los trabajos que se muestran en la página pública /portafolio:
     - Crear un portafolio nuevo (botón "Nuevo portafolio").
     - Editar cualquiera (título, categoría, descripción, enlace "Ver web",
       stack, tipo real/prueba e imagen de portada).
     - Borrar (con confirmación; también borra su imagen de Storage).
   Las cards se ven igual que en la página pública, con los botones abajo.
   ========================================================================== */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.jsx';
import { deletePortfolioItem, getPortfolio } from '../../services/portfolioService.js';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Icon from '../../components/ui/Icon.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import PortfolioCard from '../../components/portfolio/PortfolioCard.jsx';
import PortfolioForm from '../../components/admin/PortfolioForm.jsx';
import './AdminPortfolioPage.css';

function AdminPortfolioPage() {
  const { showToast } = useToast();
  const { data: items, error, reload } = useAsyncData(() => getPortfolio(), []);

  const [isCreating, setIsCreating] = useState(false);
  // Portafolio que se está editando o que se quiere borrar (null = ventana cerrada)
  const [itemToEdit, setItemToEdit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Mientras llegan los datos por primera vez (o si falló la carga)
  if (!items) {
    return <LoadingState label="Cargando portafolio..." error={error} onRetry={reload} />;
  }

  // ---------- Crear ----------
  function handleCreated(created) {
    setIsCreating(false);
    reload();
    showToast(`Portafolio "${created.title}" creado.`);
  }

  // ---------- Editar ----------
  function handleSaved(saved) {
    setItemToEdit(null);
    reload();
    showToast(`Portafolio "${saved.title}" actualizado.`);
  }

  // ---------- Borrar ----------
  async function handleConfirmDelete() {
    const target = itemToDelete;
    setItemToDelete(null);
    try {
      await deletePortfolioItem(target);
      showToast(`Portafolio "${target.title}" borrado.`, 'info');
      reload();
    } catch (actionError) {
      showToast(actionError.message, 'error');
    }
  }

  return (
    <>
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">Portafolio</h1>
          <p className="admin-header__text">
            {items.length} {items.length === 1 ? 'trabajo publicado' : 'trabajos publicados'} en la página Portafolio.
          </p>
        </div>
        <div className="admin-portfolio__header-actions">
          <Link to="/portafolio" className="btn btn--outline">
            Ver página
          </Link>
          <button
            type="button"
            className="btn btn--primary"
            onClick={(event) => {
              event.preventDefault();
              setIsCreating(true);
            }}
          >
            <Icon name="plus" className="admin-header__btn-icon" />
            Nuevo portafolio
          </button>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">Aún no hay portafolios</p>
          <p>Crea el primero con el botón "Nuevo portafolio".</p>
        </div>
      ) : (
        <ul className="admin-portfolio__grid">
          {items.map((item, index) => (
            <li key={item.id}>
              <PortfolioCard item={item} index={index} headingLevel="h2">
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={(event) => {
                    event.preventDefault();
                    setItemToEdit(item);
                  }}
                >
                  <Icon name="edit" className="admin-portfolio__btn-icon" />
                  Editar
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  aria-label={`Borrar ${item.title}`}
                  title="Borrar portafolio"
                  onClick={(event) => {
                    event.preventDefault();
                    setItemToDelete(item);
                  }}
                >
                  <Icon name="trash" />
                </button>
              </PortfolioCard>
            </li>
          ))}
        </ul>
      )}

      {/* ---------- Ventana crear ---------- */}
      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="Nuevo portafolio"
        description="Se mostrará en la página Portafolio."
        size="md"
      >
        {isCreating && (
          <PortfolioForm existingItems={items} onSaved={handleCreated} onCancel={() => setIsCreating(false)} />
        )}
      </Modal>

      {/* ---------- Ventana editar ---------- */}
      <Modal
        isOpen={Boolean(itemToEdit)}
        onClose={() => setItemToEdit(null)}
        title="Editar portafolio"
        description={itemToEdit ? itemToEdit.title : ''}
        size="md"
      >
        {itemToEdit && (
          <PortfolioForm
            item={itemToEdit}
            existingItems={items}
            onSaved={handleSaved}
            onCancel={() => setItemToEdit(null)}
          />
        )}
      </Modal>

      {/* ---------- Confirmación borrar ---------- */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        title="Borrar portafolio"
        message={
          itemToDelete
            ? `¿Seguro que quieres borrar "${itemToDelete.title}"? Se quitará de la página Portafolio y no se puede deshacer.`
            : ''
        }
        confirmLabel="Sí, borrar"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </>
  );
}

export default AdminPortfolioPage;
