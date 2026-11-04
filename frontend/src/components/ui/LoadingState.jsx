/* ==========================================================================
   ESTADO DE CARGA / ERROR
   --------------------------------------------------------------------------
   Se muestra mientras llegan los datos desde Supabase, o si la carga falló.
   Mantiene el mismo estilo de la web (nunca se usa alert).
     - Sin error: indicador giratorio + texto "Cargando...".
     - Con error: mensaje en español + botón "Reintentar".
   ========================================================================== */

import './LoadingState.css';

/**
 * @param {string} label - Texto mientras carga (ej. "Cargando proyectos...").
 * @param {Error|null} error - Error de la carga (si lo hubo).
 * @param {function} onRetry - Función que vuelve a intentar la carga.
 */
function LoadingState({ label = 'Cargando...', error = null, onRetry }) {
  if (error) {
    return (
      <div className="loading-state loading-state--error" role="alert">
        <p className="loading-state__title">No pudimos cargar la información</p>
        <p>{error.message || 'Revisa tu conexión a internet e inténtalo de nuevo.'}</p>
        {onRetry && (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={(event) => {
              event.preventDefault();
              onRetry();
            }}
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-state__spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export default LoadingState;
