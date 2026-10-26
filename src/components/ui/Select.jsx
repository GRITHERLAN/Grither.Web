/* ==========================================================================
   DESPLEGABLE (Select) CON EL ESTILO DE LA WEB
   --------------------------------------------------------------------------
   La lista de un <select> nativo la dibuja el sistema operativo y no se puede
   decorar. Este componente la reemplaza por un desplegable propio:
     - Un botón (el campo) que muestra la opción elegida.
     - Una lista flotante (role="listbox") con las opciones.
   Es accesible y se maneja con teclado:
     Enter / Espacio / Flecha abajo -> abre.   Flechas -> mueven la opción.
     Inicio / Fin -> primera / última.         Enter -> elige.
     Escape -> cierra (sin cerrar la ventana modal que lo contiene).
     Letras -> saltan a la opción que empieza por esa letra.
   Se usa igual que un <select>: recibe name, value y onChange, y llama a
   onChange con un objeto { target: { name, value } } para que los
   manejadores que ya existen en los formularios sigan funcionando.
   ========================================================================== */

import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import './Select.css';

/* Alto máximo de la lista (rem -> px con la base de 10px) y espacio de seguridad */
const LIST_MAX_HEIGHT = 260;
const VIEWPORT_MARGIN = 12;

/**
 * @param {string} id - id del botón (para que el <label htmlFor> funcione).
 * @param {string} name - Nombre del campo; se entrega en onChange.
 * @param {string} value - Valor elegido.
 * @param {Array<{value: string, label: string}>} options - Opciones a mostrar.
 * @param {function} onChange - Recibe { target: { name, value } }.
 * @param {boolean} disabled - Bloquea el campo.
 */
function Select({ id, name, value, options, onChange, disabled = false }) {
  const listId = useId();
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  // Opción resaltada con el teclado o el mouse (índice dentro de options)
  const [activeIndex, setActiveIndex] = useState(0);
  // Posición de la lista en pantalla (se calcula al abrir)
  const [position, setPosition] = useState(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  // Si el valor guardado ya no existe en la lista, se muestra el aviso de la opción vacía
  const placeholderLabel = options.find((option) => option.value === '')?.label ?? 'Selecciona una opción';

  /** Abre la lista: calcula dónde dibujarla y resalta la opción elegida */
  function open() {
    if (disabled || isOpen) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    const listHeight = Math.min(LIST_MAX_HEIGHT, options.length * 44 + 12);

    // Si abajo no cabe y arriba hay más espacio, la lista se abre hacia arriba
    const opensUp = spaceBelow < listHeight && spaceAbove > spaceBelow;

    setPosition({
      left: rect.left,
      width: rect.width,
      opensUp,
      // Hacia abajo se ancla por "top"; hacia arriba por "bottom"
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      maxHeight: Math.max(120, Math.min(LIST_MAX_HEIGHT, opensUp ? spaceAbove : spaceBelow)),
    });
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  /** Elige una opción, avisa al formulario y devuelve el foco al botón */
  function choose(index) {
    const option = options[index];
    if (option && option.value !== value) {
      onChange({ target: { name, value: option.value } });
    }
    close();
    triggerRef.current?.focus();
  }

  // Mientras está abierta: cerrar al hacer clic fuera, al hacer scroll o al
  // cambiar el tamaño de la ventana (así la lista nunca queda "flotando" mal).
  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      const clickedTrigger = triggerRef.current?.contains(event.target);
      const clickedList = listRef.current?.contains(event.target);
      if (!clickedTrigger && !clickedList) close();
    }
    function handleScrollOrResize(event) {
      // El scroll dentro de la propia lista no la debe cerrar
      if (listRef.current?.contains(event.target)) return;
      close();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Mantiene visible la opción resaltada al moverse con el teclado
  useEffect(() => {
    if (!isOpen) return;
    const activeItem = listRef.current?.children[activeIndex];
    activeItem?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  /** Teclado sobre el botón */
  function handleKeyDown(event) {
    const lastIndex = options.length - 1;

    // Cerrada: las teclas de "abrir" despliegan la lista
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        open();
      }
      return;
    }

    // Abierta: navegar, elegir o cerrar
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, lastIndex));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(lastIndex);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(activeIndex);
        break;
      case 'Escape':
        // Se detiene para que no cierre también la ventana modal
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      case 'Tab':
        close();
        break;
      default: {
        // Búsqueda por letra: salta a la siguiente opción que empiece igual
        if (event.key.length === 1) {
          const letter = event.key.toLowerCase();
          const ordered = [...options.keys()];
          const rotated = [...ordered.slice(activeIndex + 1), ...ordered.slice(0, activeIndex + 1)];
          const match = rotated.find((index) => options[index].label.toLowerCase().startsWith(letter));
          if (match !== undefined) setActiveIndex(match);
        }
      }
    }
  }

  /** Clic en el botón: abre o cierra */
  function handleTriggerClick(event) {
    event.preventDefault();
    if (isOpen) close();
    else open();
  }

  /** Clic en una opción */
  function handleOptionClick(event, index) {
    event.preventDefault();
    choose(index);
  }

  // Estilo de posición de la lista (fixed: no la recorta el scroll del modal)
  const listStyle = position
    ? {
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
        ...(position.opensUp ? { bottom: position.bottom } : { top: position.top }),
      }
    : undefined;

  return (
    <div className="select">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`field__input select__trigger ${isOpen ? 'select__trigger--open' : ''}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={isOpen ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
      >
        <span className={`select__value ${selectedOption && selectedOption.value !== '' ? '' : 'select__value--placeholder'}`}>
          {selectedOption ? selectedOption.label : placeholderLabel}
        </span>
        <Icon name="chevronDown" className="select__chevron" />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className={`select__list ${position?.opensUp ? 'select__list--up' : ''}`}
          style={listStyle}
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                className={`select__option ${isActive ? 'select__option--active' : ''} ${isSelected ? 'select__option--selected' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={(event) => handleOptionClick(event, index)}
              >
                <span className="select__option-label">{option.label}</span>
                {isSelected && <Icon name="check" className="select__check" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Select;
