/* ==========================================================================
   CONTEXTO DE NOTIFICACIONES (Toasts)
   --------------------------------------------------------------------------
   Reemplaza a alert(): cualquier componente llama a showToast(...) y aparece
   un aviso con el estilo de la web en la esquina superior derecha, que se
   cierra solo a los pocos segundos o con su botón ×.
   ========================================================================== */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ToastContainer from '../components/ui/ToastContainer.jsx';

const ToastContext = createContext(null);

/* Tiempo que dura visible cada aviso */
const TOAST_DURATION_MS = 4500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Contador para dar un id único a cada aviso
  const nextId = useRef(1);

  /** Quita un aviso por su id */
  const dismissToast = useCallback((toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  /**
   * Muestra un aviso.
   * @param {string} message - Texto a mostrar.
   * @param {'success'|'error'|'info'} type - Color e icono del aviso.
   */
  const showToast = useCallback(
    (message, type = 'success') => {
      const id = nextId.current;
      nextId.current += 1;

      setToasts((current) => [...current, { id, message, type }]);

      // Se cierra solo pasado el tiempo definido
      window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

/** Hook para mostrar avisos desde cualquier componente */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  }
  return context;
}
