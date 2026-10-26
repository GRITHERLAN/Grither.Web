/* ==========================================================================
   CONTENEDOR DE AVISOS (Toasts)
   --------------------------------------------------------------------------
   Pinta la pila de avisos que maneja ToastContext.
   aria-live="polite" hace que los lectores de pantalla los anuncien.
   ========================================================================== */

import Icon from './Icon.jsx';
import './ToastContainer.css';

/* Icono según el tipo de aviso */
const TOAST_ICONS = {
  success: 'check',
  error: 'alert',
  info: 'info',
};

function ToastContainer({ toasts, onDismiss }) {
  return (
    <section className="toasts" aria-live="polite" aria-label="Notificaciones">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast toast--${toast.type}`} role="status">
          <span className="toast__icon">
            <Icon name={TOAST_ICONS[toast.type] || 'info'} />
          </span>
          <p className="toast__message">{toast.message}</p>
          <button
            type="button"
            className="toast__close"
            aria-label="Cerrar aviso"
            onClick={(event) => {
              event.preventDefault();
              onDismiss(toast.id);
            }}
          >
            <Icon name="close" />
          </button>
        </article>
      ))}
    </section>
  );
}

export default ToastContainer;
