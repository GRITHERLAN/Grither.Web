/* ==========================================================================
   CARRUSEL CURVO DE TARJETAS (CurvedCardCarousel)
   --------------------------------------------------------------------------
   Adaptación del "3d-curved-carousel" (lente curva en WebGL) a tarjetas HTML.
   El original pinta FOTOS en un <canvas>; aquí movemos las tarjetas reales,
   así el diseño, los textos, el SEO, el tema claro/oscuro y el TiltCard
   siguen intactos.

   Qué conserva del original:
     - Lazo infinito: la tarjeta más lejana pasa al otro lado sin saltos.
     - Resorte críticamente amortiguado (springStep) y "lanzar" con el dedo
       o el ratón (restFor): se detiene en la tarjeta más cercana.
     - Efecto lente: la del centro se ve plana; cuanto más se aleja, más alta,
       más girada hacia el centro y más oscura. Opcionalmente (chromatic) un
       borde de aberración cromática (magenta / cian) que crece con la velocidad.
     - Entrada escalonada: las tarjetas suben desde abajo, la del centro primero.
     - Contador "01 / 04", barra de progreso, botones y flechas del teclado.

   Rendimiento: el bucle de animación escribe estilos directo en el DOM (sin
   estado de React por fotograma). React solo se entera cuando cambia la
   tarjeta activa. El bucle se duerme cuando todo está quieto o fuera de vista.
     - El oscurecido y el borde cromático son capas propias (<span>) a las que
       se les escribe opacity / su variable. NO se escriben variables CSS en el
       <li>: se heredan y obligarían a recalcular el estilo de todo el
       contenido de la tarjeta en cada fotograma.
     - La entrada escalonada espera a que el carrusel se vea (25 %): así se
       ve al llegar a la sección y no se "gasta" fuera de pantalla.
   ========================================================================== */

import { Children, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import './CurvedCardCarousel.css';

/* --------------------------------------------------------------------------
   Matemática del movimiento (igual que el original)
   -------------------------------------------------------------------------- */

/** Lleva cualquier índice al rango 0..n-1 */
export function wrap(i, n) {
  return n > 0 ? ((i % n) + n) % n : 0;
}

/** Distancia con signo de la tarjeta i a la posición actual, por el camino corto del lazo */
export function offsetOf(i, pos, n) {
  if (n <= 0) return 0;
  return wrap(i - pos + n / 2, n) - n / 2;
}

/** Dónde se detiene un "lanzamiento": la tarjeta entera más cercana, máximo `max` de distancia */
export function restFor(pos, velocity, max = 3) {
  const throwTo = pos + Math.max(-max, Math.min(max, velocity * 0.18));
  return Math.round(throwTo);
}

/** Un paso de un resorte críticamente amortiguado (tarjetas, tarjetas/s, segundos) */
export function springStep(pos, vel, target, dt, omega = 11) {
  const a = (target - pos) * omega * omega - vel * 2 * omega;
  const v = vel + a * dt;
  return [pos + v * dt, v];
}

/** Contador con dos cifras: 1 -> "01" */
export function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* Distancia entre tarjetas: ancho de la tarjeta + 14 % de espacio (como el original) */
const GAP_RATIO = 0.14;
/* Giro máximo hacia el centro (grados) de las tarjetas de los bordes */
const MAX_TURN_DEG = 20;
/* Distancia mínima (px) para que un clic cuente como arrastre */
const DRAG_THRESHOLD = 6;
/* Parte visible del carrusel para que empiece la entrada */
const INTRO_VISIBLE_RATIO = 0.25;

/**
 * @param {React.ReactNode} children - Una tarjeta por hijo.
 * @param {string} label - Nombre accesible del carrusel.
 * @param {number} bend - Cuánto "dobla" la lente las tarjetas de los bordes (0 = plano).
 * @param {boolean} chromatic - Borde magenta/cian de la lente (false = sin bordes de color).
 * @param {string} hint - Texto de ayuda bajo el carrusel.
 * @param {(index:number) => void} onChange - Se llama al cambiar la tarjeta activa.
 */
function CurvedCardCarousel({
  children,
  label = 'Carrusel',
  bend = 0.16,
  chromatic = true,
  hint = 'Arrastra o usa las flechas',
  className = '',
  onChange,
}) {
  const slides = Children.toArray(children);
  const n = slides.length;

  const stageRef = useRef(null);
  const itemRefs = useRef([]);
  const dimRefs = useRef([]);
  const fringeRefs = useRef([]);
  const [index, setIndex] = useState(0);
  const api = useRef({ go: () => {}, goTo: () => {} });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || n === 0) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Medidas (solo se recalculan al cambiar el tamaño)
    let W = 1;
    let step = 1;
    // Movimiento
    let pos = 0;
    let vel = 0;
    let target = 0;
    let intro = reduced.matches ? 1 : 0;
    let introStart = -1;
    let started = false; // la entrada arranca al verse el carrusel
    // Arrastre
    let dragging = false;
    let dragX = 0;
    let dragPos = 0;
    let lastX = 0;
    let lastT = 0;
    let flick = 0;
    let moved = 0;
    let downItem = -1;
    // Bucle
    let raf = 0;
    let last = 0;
    let visible = false; // lo decide el IntersectionObserver
    let current = 0;
    let disposed = false;

    const measure = () => {
      W = Math.max(1, stage.clientWidth);
      const first = itemRefs.current[0];
      const cw = first ? first.offsetWidth : 320;
      step = cw * (1 + GAP_RATIO);
      kick();
    };

    /** Pinta cada tarjeta según su distancia al centro */
    const paint = () => {
      const half = W / 2;
      const v = reduced.matches ? 0 : clamp(vel * 0.12, -1, 1);

      for (let i = 0; i < n; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;

        const d = offsetOf(i, pos, n);
        const order = Math.abs(d);
        const x = d * step;
        // Posición normalizada en la lente: 0 centro, ±1 borde del escenario
        const nx = clamp(x / half, -1.4, 1.4);
        const k = nx * nx;

        // Entrada escalonada: primero la del centro, luego las vecinas
        const t = clamp((intro - order * 0.12) / 0.6, 0, 1);
        const e = 1 - Math.pow(1 - t, 3);

        // Lente: más alta, un poco más angosta y girada hacia el centro
        const sy = 1 + bend * k + Math.abs(v) * 0.03;
        const sx = 1 - 0.06 * bend * k;
        const turn = -nx * MAX_TURN_DEG * (bend / 0.16);
        const rise = (1 - e) * 90;

        // Se oculta antes del punto donde el lazo la pasa al otro lado
        const loopFade = clamp((n / 2 - order) * 2, 0, 1);

        el.style.transform =
          `translate3d(${x.toFixed(2)}px, ${rise.toFixed(2)}%, 0) ` +
          `rotateY(${turn.toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
        el.style.opacity = (e * loopFade).toFixed(3);
        const z = String(100 - Math.round(order * 10));
        if (el.style.zIndex !== z) el.style.zIndex = z;

        // Lente: se escribe en sus propias capas (sin hijos), nunca en el <li>
        const dim = dimRefs.current[i];
        if (dim) dim.style.opacity = (0.42 * Math.min(1, k)).toFixed(3);
        const fringe = fringeRefs.current[i];
        if (fringe) {
          fringe.style.setProperty('--ccc-ca', (4 * k * (1 + Math.abs(v) * 1.5) + Math.abs(v) * 2).toFixed(2));
        }
      }
    };

    const frame = (now) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;

      if (intro < 1 && started) {
        if (introStart < 0) introStart = now;
        intro = Math.min(1.5, (now - introStart) / 1100);
        if (intro >= 1.5) intro = 1;
      }

      if (!dragging) {
        if (reduced.matches) {
          pos = target;
          vel = 0;
        } else {
          [pos, vel] = springStep(pos, vel, target, dt);
        }
      }

      const idx = wrap(Math.round(pos), n);
      if (idx !== current) {
        current = idx;
        setIndex(idx);
        onChangeRef.current?.(idx);
      }

      paint();

      const settled =
        !dragging &&
        Math.abs(target - pos) < 0.0005 &&
        Math.abs(vel) < 0.001 &&
        // Sin arrancar la entrada también se duerme: el observer la despierta
        (intro >= 1 || reduced.matches || !started);

      if (settled) {
        pos = target;
        vel = 0;
        paint();
        last = 0;
      } else if (visible) {
        raf = requestAnimationFrame(frame);
      }
    };

    function kick() {
      if (!raf && visible && !disposed) raf = requestAnimationFrame(frame);
    }

    api.current.go = (dir) => {
      target = Math.round(target) + dir;
      kick();
    };

    api.current.goTo = (i) => {
      target = Math.round(pos + offsetOf(i, pos, n));
      kick();
    };

    // ---------- Arrastre con ratón, dedo o lápiz ----------
    const onDown = (e) => {
      if (e.button !== 0) return;
      dragging = true;
      dragX = lastX = e.clientX;
      lastT = e.timeStamp;
      dragPos = pos;
      flick = 0;
      moved = 0;
      const item = e.target.closest('[data-ccc-index]');
      downItem = item ? Number(item.dataset.cccIndex) : -1;
      stage.setPointerCapture(e.pointerId);
      kick();
    };

    const onMove = (e) => {
      if (!dragging) return;
      moved = Math.max(moved, Math.abs(e.clientX - dragX));
      const dts = Math.max(1, e.timeStamp - lastT) / 1000;
      flick = flick * 0.6 + (-(e.clientX - lastX) / step / dts) * 0.4;
      vel = flick;
      lastX = e.clientX;
      lastT = e.timeStamp;
      pos = dragPos - (e.clientX - dragX) / step;
      if (moved > DRAG_THRESHOLD) stage.dataset.dragging = 'true';
      kick();
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      delete stage.dataset.dragging;

      // Clic (sin arrastre) sobre una tarjeta lateral: la trae al centro
      if (moved <= DRAG_THRESHOLD && downItem >= 0 && downItem !== current) {
        vel = 0;
        api.current.goTo(downItem);
        return;
      }

      target = restFor(pos, flick);
      vel = flick;
      kick();
    };

    const onKey = (e) => {
      if (e.key === 'ArrowRight') api.current.go(1);
      else if (e.key === 'ArrowLeft') api.current.go(-1);
      else return;
      e.preventDefault();
    };

    const onMotion = () => kick();

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('keydown', onKey);
    reduced.addEventListener('change', onMotion);

    const ro = new ResizeObserver(measure);
    ro.observe(stage);

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        visible = entry.isIntersecting;
        if (entry.intersectionRatio >= INTRO_VISIBLE_RATIO) started = true;
        if (visible) kick();
      },
      { threshold: [0, INTRO_VISIBLE_RATIO] }
    );
    io.observe(stage);

    measure();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('keydown', onKey);
      reduced.removeEventListener('change', onMotion);
    };
  }, [n, bend, chromatic]);

  if (n === 0) return null;
  const safeIndex = Math.min(index, n - 1);
  return (
    <div className={`ccc ${className}`.trim()} role="region" aria-roledescription="carrusel" aria-label={label}>
      <ul ref={stageRef} className="ccc__stage" tabIndex={0}>
        {slides.map((slide, i) => (
          <li
            key={slide.key ?? i}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className={`ccc__item${i === safeIndex ? ' is-active' : ''}`}
            data-ccc-index={i}
            aria-roledescription="tarjeta"
            aria-label={`${i + 1} de ${n}`}
          >
            {chromatic && (
              <span
                ref={(el) => {
                  fringeRefs.current[i] = el;
                }}
                className="ccc__fringe"
                aria-hidden="true"
              />
            )}
            {slide}
            <span
              ref={(el) => {
                dimRefs.current[i] = el;
              }}
              className="ccc__dim"
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>

      <div className="ccc__footer">
        <p className="ccc__hint text-mono">{hint}</p>

        <div className="ccc__controls">
          <span className="ccc__count text-mono" aria-live="polite">
            {pad2(safeIndex + 1)} <i>/ {pad2(n)}</i>
          </span>

          <span className="ccc__bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${(safeIndex + 1) / n})` }} />
          </span>

          <div className="ccc__buttons">
            <button type="button" className="ccc__btn" aria-label="Anterior" onClick={() => api.current.go(-1)}>
              <Icon name="chevronLeft" />
            </button>
            <button type="button" className="ccc__btn" aria-label="Siguiente" onClick={() => api.current.go(1)}>
              <Icon name="chevronRight" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CurvedCardCarousel;
