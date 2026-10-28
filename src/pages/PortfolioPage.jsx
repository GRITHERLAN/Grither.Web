/* ==========================================================================
   PÁGINA: PORTAFOLIO
   --------------------------------------------------------------------------
   Secciones (según el boceto Design/Portafolio_Oscuro y Portafolio_Blanco):
     1. Héroe con píldora "PORTAFOLIO", título y descripción.
     2. Filtros tipo chip:
          - Por categoría ("Todos" + una por cada categoría, con contador).
          - Por tipo de proyecto (Todos / Reales / De prueba).
        Y el texto "Mostrando X de Y".
     3. Cuadrícula de cards (se administran en Administrador > Portafolio).
     4. Llamado a la acción "¿Tu proyecto puede ser el siguiente?".
   ========================================================================== */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/ui/LoadingState.jsx';
import PortfolioCard from '../components/portfolio/PortfolioCard.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { PORTFOLIO_TYPES, getPortfolio } from '../services/portfolioService.js';
import './PortfolioPage.css';

/* Valor del chip que muestra todo */
const ALL = 'todos';

/* Chips del filtro por tipo */
const TYPE_FILTERS = [
  { value: ALL, label: 'Todos los tipos' },
  { value: PORTFOLIO_TYPES.REAL, label: 'Reales' },
  { value: PORTFOLIO_TYPES.DEMO, label: 'De prueba' },
];

function PortfolioPage() {
  const { data: items, error, reload } = useAsyncData(() => getPortfolio(), []);

  return (
    <div className="container">
      {/* ---------- 1. Héroe ---------- */}
      <section className="portfolio-hero">
        <span className="eyebrow eyebrow--pill">Portafolio</span>
        <h1 className="portfolio-hero__title">
          Proyectos que ya <span className="text-gradient">levantaron vuelo.</span>
        </h1>
        <p className="portfolio-hero__text">
          Una selección de sitios, tiendas online y sistemas a medida que he construido con Grither.
        </p>
      </section>

      {/* Mientras llegan los datos (o si falló la carga) */}
      {!items && <LoadingState label="Cargando portafolio..." error={error} onRetry={reload} />}

      {items && <PortfolioGallery items={items} />}

      {/* ---------- 4. Llamado a la acción ---------- */}
      <section className="portfolio-cta" aria-labelledby="portfolio-cta-title">
        <div>
          <h2 id="portfolio-cta-title" className="portfolio-cta__title">
            ¿Tu proyecto puede ser el siguiente?
          </h2>
          <p className="portfolio-cta__text">Cuéntame tu idea y te respondo en menos de 24 horas hábiles.</p>
        </div>
        <Link to="/contacto" className="btn btn--primary">
          Cotizar mi proyecto
        </Link>
      </section>
    </div>
  );
}

/**
 * Filtros + cuadrícula (se pinta cuando ya llegaron los datos).
 * @param {Array} items - Portafolios, del más reciente al más antiguo.
 */
function PortfolioGallery({ items }) {
  const [category, setCategory] = useState(ALL);
  const [type, setType] = useState(ALL);

  // Categorías en el orden en que aparecen, con cuántos trabajos tiene cada una
  const categories = [];
  items.forEach((item) => {
    const found = categories.find((entry) => entry.name === item.category);
    if (found) {
      found.count += 1;
    } else {
      categories.push({ name: item.category, count: 1 });
    }
  });

  // Se aplican los dos filtros a la vez
  const visibleItems = items.filter(
    (item) => (category === ALL || item.category === category) && (type === ALL || item.type === type)
  );

  /** Cuántos trabajos hay de un tipo (para el contador del chip) */
  function countType(value) {
    return value === ALL ? items.length : items.filter((item) => item.type === value).length;
  }

  /** Pinta un chip de filtro (botón con estado "presionado") */
  function renderChip({ key, label, count, isActive, onSelect }) {
    return (
      <li key={key}>
        <button
          type="button"
          className={`chip portfolio-filters__chip ${isActive ? 'chip--active' : ''}`}
          aria-pressed={isActive}
          onClick={(event) => {
            event.preventDefault();
            onSelect();
          }}
        >
          {label}
          <span className="chip__count">{count}</span>
        </button>
      </li>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state portfolio-empty">
        <p className="empty-state__title">Muy pronto verás aquí mis proyectos</p>
        <p>Mientras tanto, escríbeme y te muestro trabajos similares a lo que necesitas.</p>
      </div>
    );
  }

  return (
    <section className="portfolio-gallery" aria-labelledby="portfolio-gallery-title">
      <h2 id="portfolio-gallery-title" className="sr-only">
        Proyectos del portafolio
      </h2>

      {/* ---------- 2. Filtros ---------- */}
      <div className="portfolio-filters">
        <div className="portfolio-filters__groups">
          <ul className="portfolio-filters__list" aria-label="Filtrar por categoría">
            {renderChip({
              key: ALL,
              label: 'Todos',
              count: items.length,
              isActive: category === ALL,
              onSelect: () => setCategory(ALL),
            })}
            {categories.map((entry) =>
              renderChip({
                key: entry.name,
                label: entry.name,
                count: entry.count,
                isActive: category === entry.name,
                onSelect: () => setCategory(entry.name),
              })
            )}
          </ul>

          <ul className="portfolio-filters__list" aria-label="Filtrar por tipo de proyecto">
            {TYPE_FILTERS.map((filter) =>
              renderChip({
                key: filter.value,
                label: filter.label,
                count: countType(filter.value),
                isActive: type === filter.value,
                onSelect: () => setType(filter.value),
              })
            )}
          </ul>
        </div>

        {/* aria-live: los lectores de pantalla anuncian el cambio al filtrar */}
        <p className="portfolio-filters__meta text-mono" aria-live="polite">
          Mostrando {visibleItems.length} de {items.length}
        </p>
      </div>

      {/* ---------- 3. Cuadrícula ---------- */}
      {visibleItems.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">No hay proyectos con estos filtros</p>
          <p>Prueba con otra categoría o tipo de proyecto.</p>
        </div>
      ) : (
        <ul className="portfolio-grid">
          {visibleItems.map((item, index) => (
            <li key={item.id}>
              <PortfolioCard item={item} index={index} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default PortfolioPage;
