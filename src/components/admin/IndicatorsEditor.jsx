/* ==========================================================================
   EDITOR DE INDICADORES (Panel Admin)
   --------------------------------------------------------------------------
   Lista editable de indicadores { value, label }:
     - Cambiar el valor ("+30") y la descripción ("Proyectos entregados").
     - Agregar uno nuevo (máximo 6).
     - Quitar uno (mínimo 1).
   ========================================================================== */

import Icon from '../ui/Icon.jsx';
import './IndicatorsEditor.css';

const MAX_INDICATORS = 6;

/**
 * @param {Array<{value:string,label:string}>} indicators
 * @param {function} onChange - Recibe la lista nueva completa.
 * @param {string} error - Mensaje de error (opcional).
 */
function IndicatorsEditor({ indicators, onChange, error = '' }) {
  /** Cambia un campo de un indicador */
  function handleFieldChange(index, field, value) {
    const nextIndicators = indicators.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    );
    onChange(nextIndicators);
  }

  function handleAdd(event) {
    event.preventDefault();
    onChange([...indicators, { value: '', label: '' }]);
  }

  function handleRemove(event, indexToRemove) {
    event.preventDefault();
    onChange(indicators.filter((_, index) => index !== indexToRemove));
  }

  return (
    <fieldset className="indicators-editor">
      <legend className="field__label">Indicadores</legend>

      <ul className="indicators-editor__list">
        {indicators.map((indicator, index) => (
          <li key={index} className="indicators-editor__row">
            <label className="sr-only" htmlFor={`indicator-value-${index}`}>
              Valor del indicador {index + 1}
            </label>
            <input
              id={`indicator-value-${index}`}
              className="field__input text-mono"
              placeholder="+30"
              value={indicator.value}
              onChange={(event) => handleFieldChange(index, 'value', event.target.value)}
            />
            <label className="sr-only" htmlFor={`indicator-label-${index}`}>
              Descripción del indicador {index + 1}
            </label>
            <input
              id={`indicator-label-${index}`}
              className="field__input"
              placeholder="Proyectos entregados"
              value={indicator.label}
              onChange={(event) => handleFieldChange(index, 'label', event.target.value)}
            />
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              aria-label={`Quitar indicador ${index + 1}`}
              disabled={indicators.length <= 1}
              onClick={(event) => handleRemove(event, index)}
            >
              <Icon name="trash" />
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="field__error">{error}</p>}

      <button
        type="button"
        className="btn btn--outline btn--sm indicators-editor__add"
        disabled={indicators.length >= MAX_INDICATORS}
        onClick={handleAdd}
      >
        <Icon name="plus" className="indicators-editor__add-icon" />
        Agregar indicador
      </button>
    </fieldset>
  );
}

export default IndicatorsEditor;
