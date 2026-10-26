/* ==========================================================================
   INDICADOR DE FASES DEL PROYECTO
   --------------------------------------------------------------------------
   Muestra las 4 fases (Reunión → Bocetos → Desarrollo → Despliegue) y marca:
     - Completadas: las anteriores a la fase actual (✓).
     - Actual: resaltada con el color de acento.
     - Pendientes: en gris.
   Si el proyecto está terminado, TODAS las fases llevan ✓ y la última dice
   "Desplegado".
   ========================================================================== */

import { PROJECT_PHASES } from '../../services/projectService.js';
import Icon from './Icon.jsx';
import './PhaseStepper.css';

/**
 * @param {string} currentPhase - Valor de la fase actual (ej. "desarrollo").
 * @param {boolean} isCompleted - Proyecto terminado: todas las fases con ✓.
 * @param {boolean} compact - Versión pequeña para las tarjetas.
 */
function PhaseStepper({ currentPhase, isCompleted = false, compact = false }) {
  const currentIndex = PROJECT_PHASES.findIndex((phase) => phase.value === currentPhase);

  return (
    <ol className={`phase-stepper ${compact ? 'phase-stepper--compact' : ''}`} aria-label="Fases del proyecto">
      {PROJECT_PHASES.map((phase, index) => {
        // Decidimos el estado de cada fase comparando su posición con la actual
        let stepState = 'pending';
        if (index < currentIndex) stepState = 'done';
        if (index === currentIndex) stepState = 'current';
        if (isCompleted) stepState = 'done';

        // La fase final de un proyecto terminado se lee "Desplegado"
        const label = isCompleted && index === PROJECT_PHASES.length - 1 ? 'Desplegado' : phase.label;

        return (
          <li
            key={phase.value}
            className={`phase-stepper__step phase-stepper__step--${stepState}`}
            aria-current={stepState === 'current' ? 'step' : undefined}
          >
            <span className="phase-stepper__circle">
              {stepState === 'done' ? <Icon name="check" /> : index + 1}
            </span>
            <span className="phase-stepper__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default PhaseStepper;
