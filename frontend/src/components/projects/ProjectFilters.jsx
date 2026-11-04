/* ==========================================================================
   FILTROS DE PROYECTOS (Panel Admin)
   --------------------------------------------------------------------------
   - Búsqueda por ID y por Nombre.
   - Chips de estado: Todos / Activos / Inactivos / Cancelados (con conteo).
   - Categoría.
   - Orden: Fecha (antiguo↔reciente) y Precio (mayor↔menor).
   - Agregados recientemente (últimos 7 / 30 / 90 días, de nuevo a antiguo).
   El componente no guarda estado propio: todo viene del padre por props.
   ========================================================================== */

import { memo } from 'react';
import Icon from '../ui/Icon.jsx';
import Select from '../ui/Select.jsx';
import { PROJECT_CATEGORIES } from '../../services/projectService.js';
import { SORT_OPTIONS, RECENT_OPTIONS } from '../../utils/filterProjects.js';
import { MAX_LENGTH } from '../../utils/validators.js';
import './ProjectFilters.css';

/* Opciones del desplegable Categoría: "Todas" + cada categoría */
const CATEGORY_FILTER_OPTIONS = [
  { value: 'todas', label: 'Todas las categorías' },
  ...PROJECT_CATEGORIES.map((category) => ({ value: category, label: category })),
];

/* Chips de estado */
const STATUS_CHIPS = [
  { value: 'todos', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
  { value: 'cancelado', label: 'Cancelados' },
];

/**
 * @param {object} filters - Filtros actuales.
 * @param {function} onChange - Recibe solo los campos que cambiaron.
 * @param {function} onReset - Vuelve a los filtros por defecto.
 * @param {object} counts - Cantidad de proyectos por estado.
 * @param {boolean} hideStatus - Oculta los chips de estado (sección "Terminados").
 */
function ProjectFilters({ filters, onChange, onReset, counts, hideStatus = false }) {
  /** Inputs y selects: actualizan el filtro con el mismo nombre */
  function handleFieldChange(event) {
    const { name, value } = event.target;

    // "Agregados recientemente" siempre se muestra de nuevo a antiguo
    if (name === 'recentDays' && value !== 'todos') {
      onChange({ recentDays: value, sort: 'fecha-desc' });
      return;
    }
    onChange({ [name]: value });
  }

  /** Chips de estado */
  function handleStatusClick(event, status) {
    event.preventDefault();
    onChange({ status });
  }

  function handleReset(event) {
    event.preventDefault();
    onReset();
  }

  return (
    <section className="card project-filters" aria-label="Filtros de proyectos">
      {/* Fila 1: búsquedas */}
      <div className="project-filters__search">
        <label className="project-filters__search-field">
          <Icon name="search" />
          <span className="sr-only">Buscar por ID</span>
          <input
            name="idQuery"
            className="field__input"
            placeholder="Buscar por ID (ej. GTH-8041)"
            value={filters.idQuery}
            onChange={handleFieldChange}
            maxLength={MAX_LENGTH.SEARCH}
          />
        </label>
        <label className="project-filters__search-field">
          <Icon name="search" />
          <span className="sr-only">Buscar por nombre</span>
          <input
            name="nameQuery"
            className="field__input"
            placeholder="Buscar por nombre"
            value={filters.nameQuery}
            onChange={handleFieldChange}
            maxLength={MAX_LENGTH.SEARCH}
          />
        </label>
      </div>

      {/* Fila 2: chips de estado */}
      {!hideStatus && (
      <div className="project-filters__chips" role="group" aria-label="Filtrar por estado">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            aria-pressed={filters.status === chip.value}
            className={`chip ${filters.status === chip.value ? 'chip--active' : ''}`}
            onClick={(event) => handleStatusClick(event, chip.value)}
          >
            {chip.label} <span className="chip__count">{counts[chip.value]}</span>
          </button>
        ))}
      </div>
      )}

      {/* Fila 3: selects */}
      <div className="project-filters__selects">
        <label className="field">
          <span className="field__label">Categoría</span>
          <Select name="category" value={filters.category} onChange={handleFieldChange} options={CATEGORY_FILTER_OPTIONS} />
        </label>

        <label className="field">
          <span className="field__label">Ordenar por</span>
          <Select name="sort" value={filters.sort} onChange={handleFieldChange} options={SORT_OPTIONS} />
        </label>

        <label className="field">
          <span className="field__label">Agregados recientemente</span>
          <Select name="recentDays" value={filters.recentDays} onChange={handleFieldChange} options={RECENT_OPTIONS} />
        </label>

        <button type="button" className="btn btn--outline project-filters__reset" onClick={handleReset}>
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}

// memo: solo se vuelve a dibujar si cambian sus props (RENDIMIENTO)
export default memo(ProjectFilters);
