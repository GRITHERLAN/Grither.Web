/* ==========================================================================
   CARRUSEL 3D DEL PORTAFOLIO
   --------------------------------------------------------------------------
   Diseño tomado de CardsCar/index.html, con las mismas cards del sitio
   (PortfolioCard) y los colores del tema:
     - La card activa queda al centro; las vecinas giran hacia atrás en
       abanico (perspectiva 3D) y se oscurecen.
     - Es infinito: después de la última vuelve la primera.
     - Se mueve arrastrando (ratón o dedo), con las flechas del teclado o
       con el dock de abajo (contador, anterior, reproducir y siguiente).
     - Al tocar una card vecina, esa pasa al centro.
     - Reproducción automática: avanza al darle play y luego cada 6 s; una
       barra en el dock muestra cuánto falta. Se pausa al arrastrar o con la
       pestaña oculta.

   Rendimiento (60 fps en celular y PC):
     - Durante el arrastre React NO vuelve a pintar: el transform de cada
       card se escribe directo en el DOM, una vez por fotograma.
     - Las cards están memorizadas (memo): al cambiar de proyecto solo cambia
       el estilo de cada <li>, no su contenido.
     - Solo se animan transform y opacity (los hace la GPU).
   ========================================================================== */

import { memo, useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import PortfolioCard from './PortfolioCard.jsx';
import './PortfolioCarousel.css';

/* Ancho máximo de cada card (px) y cuánto ocupa del escenario en celular */
const MAX_CARD_WIDTH = 370;
const CARD_WIDTH_RATIO = 0.8;
/* Distancia entre cards, relativa a su ancho */
const SPACING_RATIO = 0.74;
/* Cards visibles a cada lado de la activa */
const SIDE_CARDS = 2;
/* Tiempo entre cambios con la reproducción automática */
const AUTOPLAY_MS = 6000;

/* La card no se vuelve a pintar si no cambian sus datos */
const MemoCard = memo(PortfolioCard);

/** Módulo que siempre da positivo (para el carrusel infinito) */
const wrap = (value, length) => ((value % length) + length) % length;

/**
 * Posición 3D de una card según su distancia a la activa.
 * @param {number} visual - Distancia (con decimales mientras se arrastra).
 * @param {number} spacing - Separación entre cards en px.
 */
function getSlideMotion(visual, spacing) {
  const distance = Math.abs(visual);
  return {
    transform: `translate3d(${visual * spacing}px, 0, ${-Math.min(distance, 3) * 130}px) rotateY(${-Math.max(-40, Math.min(40, visual * 28))}deg) scale(${1 - Math.min(distance, 3) * 0.08})`,
    shade: Math.min(distance, 2) * 0.28,
  };
}

/**
 * @param {Array} items - Portafolios a mostrar (ya filtrados).
 */
function PortfolioCarousel({ items }) {
  // "position" no tiene límite (puede ser -3 o 12): así las cards siempre
  // avanzan hacia el mismo lado y no "rebobinan" al dar la vuelta
  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [stageWidth, setStageWidth] = useState(1100);
  const [isPageVisible, setIsPageVisible] = useState(true);

  const stageRef = useRef(null);
  const slideRefs = useRef(new Map());
  const dragRef = useRef(null);
  const frameRef = useRef(0);
  const blockClicksUntil = useRef(0);

  const total = items.length;
  const current = wrap(position, total);
  const cardWidth = Math.min(MAX_CARD_WIDTH, stageWidth * CARD_WIDTH_RATIO);
  const spacing = cardWidth * SPACING_RATIO;

  // Los manejadores del arrastre leen estos valores sin esperar a React
  const latest = useRef({ position, spacing });
  latest.current = { position, spacing };

  // Con pocos proyectos se muestran menos vecinas (para no repetir la misma)
  const before = Math.min(SIDE_CARDS, Math.floor((total - 1) / 2));
  const after = Math.min(SIDE_CARDS, Math.ceil((total - 1) / 2));
  // Se pinta una card extra (invisible) a cada lado: así la que entra ya
  // existe y llega deslizándose en vez de aparecer de golpe
  const slots = total > 1 ? Array.from({ length: before + after + 3 }, (_, i) => position + i - before - 1) : [position];

  const canAutoplay = isPlaying && !isDragging && isPageVisible && total > 1;

  /* ---------- Ancho del escenario (define el tamaño de las cards) ---------- */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const update = () => setStageWidth(stage.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  /* ---------- Pausa cuando la pestaña no se ve ---------- */
  useEffect(() => {
    const update = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  /* ---------- Reproducción automática ---------- */
  useEffect(() => {
    if (!canAutoplay) return undefined;
    const timer = setTimeout(() => setPosition((value) => value + 1), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [canAutoplay, position]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  function goTo(nextPosition) {
    setPosition(nextPosition);
  }

  function togglePlay() {
    // Al darle play avanza en el acto: se nota que ya está funcionando
    if (!isPlaying) goTo(position + 1);
    setIsPlaying(!isPlaying);
  }

  /** Mueve las cards siguiendo al dedo, directo en el DOM (sin React) */
  function paintDrag(dragOffset) {
    const { position: base, spacing: gap } = latest.current;
    slideRefs.current.forEach((element, slot) => {
      const motion = getSlideMotion(slot - base + dragOffset, gap);
      element.style.transform = motion.transform;
      element.style.setProperty('--carousel-shade', motion.shade);
    });
  }

  /* ---------- Arrastre ---------- */
  function handlePointerDown(event) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragRef.current = { x: event.clientX, y: event.clientY, time: performance.now(), horizontal: false };
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;

    // Si el gesto es vertical se suelta: el usuario quiere hacer scroll
    if (!drag.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      dragRef.current = null;
      return;
    }

    if (!drag.horizontal && Math.abs(dx) > 8) {
      drag.horizontal = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }

    if (drag.horizontal) {
      drag.offset = Math.max(-1.2, Math.min(1.2, dx / latest.current.spacing));
      // Muchos "pointermove" por fotograma se agrupan en una sola escritura
      if (!frameRef.current) {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = 0;
          if (dragRef.current) paintDrag(dragRef.current.offset);
        });
      }
    }
  }

  function handlePointerEnd(event, cancelled = false) {
    const drag = dragRef.current;
    dragRef.current = null;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;

    if (drag?.horizontal) {
      const dx = event.clientX - drag.x;
      const speed = Math.abs(dx) / Math.max(1, performance.now() - drag.time);
      // Cambia si se arrastró lo suficiente o con un gesto rápido
      const changes = !cancelled && (Math.abs(dx) > Math.min(55, cardWidth * 0.18) || (Math.abs(dx) > 14 && speed > 0.35));

      // Se reactiva la transición antes de soltar, para que las cards
      // lleguen deslizándose a su lugar (y no de golpe)
      stageRef.current.removeAttribute('data-dragging');
      if (changes) {
        setPosition((value) => value + (dx < 0 ? 1 : -1));
      } else {
        paintDrag(0); // vuelve a su lugar
      }
      // El "click" que llega al soltar no debe abrir enlaces
      blockClicksUntil.current = performance.now() + 300;
    }

    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleClickCapture(event) {
    if (performance.now() < blockClicksUntil.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(position + 1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(position - 1);
    }
  }

  return (
    <section
      className="portfolio-carousel"
      aria-label="Carrusel de proyectos"
      aria-roledescription="carrusel"
      style={{ '--carousel-card-w': `${cardWidth}px` }}
      onKeyDown={handleKeyDown}
    >
      {/* ---------- Escenario 3D ---------- */}
      <div
        ref={stageRef}
        className="portfolio-carousel__stage"
        data-dragging={isDragging || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => handlePointerEnd(event)}
        onPointerCancel={(event) => handlePointerEnd(event, true)}
        onClickCapture={handleClickCapture}
      >
        <div className="portfolio-carousel__floor" aria-hidden="true"></div>

        <ul className="portfolio-carousel__track">
          {slots.map((slot) => {
            const itemIndex = wrap(slot, total);
            const offset = slot - position;
            const motion = getSlideMotion(offset, spacing);
            const isActive = slot === position;
            const isHidden = offset < -before || offset > after;

            return (
              <li
                key={slot}
                ref={(element) => {
                  if (element) slideRefs.current.set(slot, element);
                  else slideRefs.current.delete(slot);
                }}
                className="portfolio-carousel__slide"
                data-active={isActive || undefined}
                data-hidden={isHidden || undefined}
                aria-hidden={isHidden || undefined}
                onClick={() => !isActive && goTo(slot)}
                style={{
                  transform: motion.transform,
                  zIndex: 10 - Math.abs(offset),
                  '--carousel-shade': motion.shade,
                }}
              >
                {/* Las vecinas no reciben foco ni clicks propios: un click
                    sobre ellas lo recibe el <li> y la trae al centro */}
                <div className="portfolio-carousel__card" inert={isActive ? undefined : ''}>
                  <MemoCard item={items[itemIndex]} index={itemIndex} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ---------- Dock de controles ---------- */}
      <div className="portfolio-carousel__bottom">
        <div className="portfolio-carousel__dock" role="group" aria-label="Controles del carrusel">
          <span className="portfolio-carousel__count text-mono" aria-hidden="true">
            <b>{String(current + 1).padStart(2, '0')}</b>/<span>{String(total).padStart(2, '0')}</span>
          </span>
          <div className="portfolio-carousel__buttons">
            <button type="button" onClick={() => goTo(position - 1)} aria-label="Proyecto anterior" disabled={total < 2}>
              <Icon name="chevronLeft" />
            </button>
            <button
              type="button"
              className="portfolio-carousel__play"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              aria-pressed={isPlaying}
              disabled={total < 2}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} />
            </button>
            <button type="button" onClick={() => goTo(position + 1)} aria-label="Proyecto siguiente" disabled={total < 2}>
              <Icon name="chevronRight" />
            </button>
          </div>

          {/* Barra de tiempo hasta el siguiente cambio: la key la reinicia
              en cada avance (y al reanudar después de una pausa) */}
          {canAutoplay && (
            <span
              key={position}
              className="portfolio-carousel__progress"
              style={{ '--carousel-autoplay': `${AUTOPLAY_MS}ms` }}
              aria-hidden="true"
            ></span>
          )}
        </div>
        <p className="portfolio-carousel__hint text-mono">
          Arrastra para explorar o usa
          <Icon name="arrowLeft" />
          <Icon name="arrowRight" />
        </p>
      </div>

      {/* Lectores de pantalla: anuncia el proyecto actual al cambiar */}
      <p className="sr-only" aria-live="polite">
        {`${items[current].title}. ${current + 1} de ${total}.`}
      </p>
    </section>
  );
}

export default PortfolioCarousel;
