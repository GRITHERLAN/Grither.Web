/* ==========================================================================
   ETIQUETA DE ESTADO DEL PROYECTO
   --------------------------------------------------------------------------
   Píldora con punto de color: verde (Activo), amarillo (Inactivo),
   rojo (Cancelado).
   ========================================================================== */

import { STATUS_LABELS } from '../../services/projectService.js';
import './StatusBadge.css';

function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${status}`}>{STATUS_LABELS[status]}</span>;
}

export default StatusBadge;
