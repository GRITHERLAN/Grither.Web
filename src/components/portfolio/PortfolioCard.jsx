/* ==========================================================================
   CARD DE PORTAFOLIO
   --------------------------------------------------------------------------
   Se usa en la página pública /portafolio y en el panel admin (Portafolio).
   Muestra (como en el boceto):
     - Portada: la imagen subida o, si no hay, un boceto de navegador hecho
       con CSS (puntos, barra de color y bloques).
     - Etiqueta de categoría y etiqueta "Proyecto real" / "Proyecto de prueba".
     - Título, descripción y el stack como etiquetas.
     - Enlace "Ver web" (abre en otra pestaña).
   "children" permite agregar botones extra abajo (Editar / Borrar en el admin).

   Botón "Descripción": solo se ve en el carrusel en celular (lo decide el
   CSS). Ahí la descripción y el stack se ocultan para que la card no sea
   tan alta, y este botón los abre en un panel encima de la card.
   ========================================================================== */

import { useEffect, useId, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { PORTFOLIO_TYPES, PORTFOLIO_TYPE_LABELS } from '../../services/portfolioService.js';
import { toSafeHref } from '../../utils/validators.js';
import './PortfolioCard.css';

/* Colores del boceto de navegador: se alternan entre cards (como en el diseño) */
const MOCKUP_VARIANTS = 4;

/**
 * @param {object} item - Portafolio ({ title, description, category, stack, url, type, imageUrl }).
 * @param {number} index - Posición en la lista (elige el color del boceto).
 * @param {string} headingLevel - Etiqueta del título ('h2' o 'h3') según la página.
 * @param {boolean} isActive - En el carrusel: false cuando la card sale del centro
 *   (cierra el panel de descripción).
 */
function PortfolioCard({ item, index = 0, headingLevel = 'h3', isActive, children }) {
  const Heading = headingLevel;
  const isReal = item.type === PORTFOLIO_TYPES.REAL;
  const descriptionId = useId();
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const openButtonRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Si la card deja de estar al centro, el panel se cierra
  useEffect(() => {
    if (isActive === false) setIsDescriptionOpen(false);
  }, [isActive]);

  function openDescription() {
    setIsDescriptionOpen(true);
    // El foco pasa a "Cerrar" (después de que el panel se muestre)
    requestAnimationFrame(() => closeButtonRef.current?.focus());
  }

  function closeDescription() {
    setIsDescriptionOpen(false);
    openButtonRef.current?.focus();
  }

  return (
    <article className="card portfolio-card">
      {/* ---------- Portada ---------- */}
      <div className={`portfolio-card__cover portfolio-card__cover--${index % MOCKUP_VARIANTS}`}>
        {item.imageUrl ? (
          <img
            className="portfolio-card__image"
            src={item.imageUrl}
            alt={`Vista del proyecto ${item.title}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          // Boceto de navegador decorativo (no aporta información)
          <div className="portfolio-card__mockup" aria-hidden="true">
            <span className="portfolio-card__dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="portfolio-card__bar"></span>
            <span className="portfolio-card__line"></span>
            <span className="portfolio-card__blocks">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        )}
      </div>

      {/* ---------- Contenido ---------- */}
      <div className="portfolio-card__body">
        <div className="portfolio-card__labels">
          <span className="tag portfolio-card__category">{item.category}</span>
          <span className={`portfolio-card__type ${isReal ? 'portfolio-card__type--real' : ''}`}>
            {PORTFOLIO_TYPE_LABELS[item.type]}
          </span>
        </div>

        <Heading className="portfolio-card__title">{item.title}</Heading>

        <button
          ref={openButtonRef}
          type="button"
          className="portfolio-card__desc-toggle"
          aria-expanded={isDescriptionOpen}
          aria-controls={descriptionId}
          onClick={openDescription}
        >
          Descripción
          <Icon name="chevronDown" />
        </button>

        <div
          id={descriptionId}
          className="portfolio-card__description"
          data-open={isDescriptionOpen || undefined}
          onKeyDown={(event) => event.key === 'Escape' && closeDescription()}
        >
          <p className="portfolio-card__text">{item.description}</p>

          <ul className="tag-list portfolio-card__stack" aria-label="Stack usado">
            {item.stack.map((tech) => (
              <li key={tech} className="tag text-mono">
                {tech}
              </li>
            ))}
          </ul>

          <button
            ref={closeButtonRef}
            type="button"
            className="btn btn--outline btn--sm portfolio-card__desc-close"
            onClick={closeDescription}
          >
            <Icon name="close" />
            Cerrar
          </button>
        </div>

        <a
          href={toSafeHref(item.url)}
          className="portfolio-card__link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ver web de ${item.title} (se abre en otra pestaña)`}
        >
          Ver web
          <Icon name="arrowRight" className="portfolio-card__link-icon" />
        </a>

        {children && <div className="portfolio-card__actions">{children}</div>}
      </div>
    </article>
  );
}

export default PortfolioCard;
