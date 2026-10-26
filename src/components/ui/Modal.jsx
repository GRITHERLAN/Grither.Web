/* ==========================================================================
   VENTANA MODAL
   --------------------------------------------------------------------------
   Usa el elemento nativo <dialog> de HTML5, que ya trae:
     - Fondo oscuro detrás (::backdrop).
     - Cerrar con la tecla Escape.
     - Foco atrapado dentro mientras está abierta.
   El contenido solo se monta cuando está abierta, así los formularios
   internos empiezan limpios cada vez.
   ========================================================================== */

import { useEffect, useId, useRef } from 'react';
import Icon from './Icon.jsx';
import './Modal.css';

/**
 * @param {boolean} isOpen - Si la ventana está visible.
 * @param {function} onClose - Se llama al cerrar (×, Escape o clic afuera).
 * @param {string} title - Título de la ventana.
 * @param {string} description - Texto corto bajo el título (opcional).
 * @param {'sm'|'md'|'lg'} size - Ancho máximo.
 */
function Modal({ isOpen, onClose, title, description = '', size = 'md', children }) {
  const dialogRef = useRef(null);
  // Id único para enlazar el título con el dialog (accesibilidad)
  const titleId = useId();

  // Abrimos o cerramos el <dialog> nativo según la prop isOpen
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  /** La tecla Escape dispara "cancel": lo controlamos nosotros */
  function handleCancel(event) {
    event.preventDefault();
    onClose();
  }

  /** Si el clic cae en el fondo (el propio <dialog>), cerramos */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size}`}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
    >
      {isOpen && (
        <div className="modal__panel">
          <header className="modal__header">
            <div>
              <h2 id={titleId} className="modal__title">
                {title}
              </h2>
              {description && <p className="modal__description">{description}</p>}
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label="Cerrar ventana"
              onClick={(event) => {
                event.preventDefault();
                onClose();
              }}
            >
              <Icon name="close" />
            </button>
          </header>

          <div className="modal__body">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export default Modal;
