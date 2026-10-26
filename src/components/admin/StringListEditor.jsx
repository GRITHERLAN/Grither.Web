/* ==========================================================================
   EDITOR DE LISTA DE TEXTOS (Panel Admin)
   --------------------------------------------------------------------------
   Lista editable de textos cortos. Se usa para las etiquetas de un servicio
   y para las características de un plan:
     - Cambiar cada texto.
     - Agregar uno nuevo (hasta el máximo indicado).
     - Quitar uno (mínimo 1).
   ========================================================================== */

import { useId } from 'react';
import Icon from '../ui/Icon.jsx';
import './StringListEditor.css';

/**
 * @param {string} label - Título del grupo ("Etiquetas", "Características"...).
 * @param {string[]} items - Textos actuales.
 * @param {function} onChange - Recibe la lista nueva completa.
 * @param {string} addLabel - Texto del botón agregar.
 * @param {string} placeholder - Ejemplo dentro de cada input.
 * @param {number} max - Máximo de elementos.
 * @param {string} error - Mensaje de error (opcional).
 */
function StringListEditor({ label, items, onChange, addLabel, placeholder = '', max = 6, error = '' }) {
  // Prefijo único para enlazar cada input con su label oculto
  const baseId = useId();

  function handleItemChange(index, value) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function handleAdd(event) {
    event.preventDefault();
    onChange([...items, '']);
  }

  function handleRemove(event, indexToRemove) {
    event.preventDefault();
    onChange(items.filter((_, index) => index !== indexToRemove));
  }

  return (
    <fieldset className={`string-list ${error ? 'string-list--error' : ''}`}>
      <legend className="field__label">{label}</legend>

      <ul className="string-list__items">
        {items.map((item, index) => (
          <li key={index} className="string-list__row">
            <label className="sr-only" htmlFor={`${baseId}-${index}`}>
              {label} {index + 1}
            </label>
            <input
              id={`${baseId}-${index}`}
              className="field__input"
              placeholder={placeholder}
              value={item}
              onChange={(event) => handleItemChange(index, event.target.value)}
            />
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              aria-label={`Quitar ${label.toLowerCase()} ${index + 1}`}
              disabled={items.length <= 1}
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
        className="btn btn--outline btn--sm string-list__add"
        disabled={items.length >= max}
        onClick={handleAdd}
      >
        <Icon name="plus" className="string-list__add-icon" />
        {addLabel}
      </button>
    </fieldset>
  );
}

export default StringListEditor;
