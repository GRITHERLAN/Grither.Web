/* ==========================================================================
   VENTANA DE CONFIRMACIÓN
   --------------------------------------------------------------------------
   Reemplaza a confirm() del navegador con el mismo estilo de la web.
   Ejemplo: "¿Seguro que quieres borrar el proyecto GTH-8041?"
   ========================================================================== */

import Modal from './Modal.jsx';

/**
 * @param {boolean} isOpen
 * @param {string} title
 * @param {string} message
 * @param {string} confirmLabel - Texto del botón de confirmar.
 * @param {boolean} danger - Si es una acción destructiva (botón rojo).
 * @param {function} onConfirm
 * @param {function} onCancel
 */
function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <p className="text-muted">{message}</p>

      <div className="modal__actions">
        <button
          type="button"
          className="btn btn--outline"
          onClick={(event) => {
            event.preventDefault();
            onCancel();
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
          onClick={(event) => {
            event.preventDefault();
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
