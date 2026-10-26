/* ==========================================================================
   VENTANA PARA CANCELAR UN PROYECTO
   --------------------------------------------------------------------------
   Pide una observación de cancelación OBLIGATORIA antes de cancelar.
   ========================================================================== */

import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { cancelProject } from '../../services/projectService.js';

/**
 * @param {object|null} project - Proyecto a cancelar (null = cerrado).
 * @param {function} onClose - Cierra sin cancelar.
 * @param {function} onCancelled - Recibe el proyecto ya cancelado.
 */
function CancelProjectDialog({ project, onClose, onCancelled }) {
  const isOpen = Boolean(project);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar proyecto"
      description={project ? `${project.id} · ${project.name}` : ''}
      size="sm"
    >
      {/* El formulario se monta solo con la ventana abierta: empieza vacío cada vez */}
      {project && <CancelForm project={project} onClose={onClose} onCancelled={onCancelled} />}
    </Modal>
  );
}

/** Formulario interno con la observación */
function CancelForm({ project, onClose, onCancelled }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    try {
      // El servicio valida que la observación tenga el largo mínimo
      const cancelledProject = cancelProject(project.id, reason);
      onCancelled(cancelledProject);
    } catch (serviceError) {
      setError(serviceError.fieldErrors?.reason || serviceError.message);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className={`field ${error ? 'field--error' : ''}`}>
        <label className="field__label" htmlFor="cancel-reason">
          Observación de cancelación
        </label>
        <textarea
          id="cancel-reason"
          className="field__input"
          placeholder="Explica por qué se cancela el proyecto..."
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError('');
          }}
        />
        {error && <p className="field__error">{error}</p>}
      </div>

      <div className="modal__actions">
        <button
          type="button"
          className="btn btn--outline"
          onClick={(event) => {
            event.preventDefault();
            onClose();
          }}
        >
          Volver
        </button>
        <button type="submit" className="btn btn--danger">
          Cancelar proyecto
        </button>
      </div>
    </form>
  );
}

export default CancelProjectDialog;
