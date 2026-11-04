/* ==========================================================================
   TARJETA CON INCLINACIÓN 3D (TiltCard)
   --------------------------------------------------------------------------
   Un <article> que se inclina en 3D siguiendo al puntero y vuelve a su
   lugar al salir. Se usa en las cards de "Qué hago" y "Planes".

   Cómo funciona:
     - Al mover el ratón calculamos el giro (máx. 7°) según dónde está el
       puntero respecto al centro, y lo guardamos en variables CSS
       (--tilt-rx, --tilt-ry). El CSS (motion.css) hace el giro 3D.
     - data-tilt="active" mientras el puntero está encima: el CSS sigue al
       puntero con una transición muy corta y "levanta" las capas internas
       (encabezado de vidrio, precio) para dar profundidad.
     - Al salir, data-tilt="idle" y el giro vuelve a 0 con curva de resorte.
       Como es una transición CSS, siempre parte del ángulo actual: si el
       puntero vuelve a entrar a mitad de camino, la tarjeta lo sigue sin saltos.
   No guardamos nada en el estado de React: así mover el ratón no vuelve a
   dibujar el componente (solo cambian dos variables CSS por fotograma).

   Solo con ratón y sin "reducir movimiento"; en celulares la tarjeta queda quieta.
   ========================================================================== */

import { useRef } from 'react';

/* Giro máximo en grados cuando el puntero está en un borde */
const MAX_TILT_DEG = 7;

/** ¿Se puede inclinar? (ratón y sin "reducir movimiento" en el sistema) */
function canTilt(event) {
  return (
    event.pointerType === 'mouse' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * @param {string} className - Clases de la tarjeta (ej. "card plan-card").
 * @param {React.ReactNode} children - Contenido de la tarjeta.
 */
function TiltCard({ className = '', children }) {
  const cardRef = useRef(null);
  // Último punto del puntero y fotograma pendiente (para no calcular de más)
  const pointerRef = useRef(null);
  const frameRef = useRef(0);

  /** Calcula el giro con la última posición del puntero (una vez por fotograma) */
  function paintTilt() {
    frameRef.current = 0;
    const card = cardRef.current;
    const pointer = pointerRef.current;
    if (!card || !pointer) return;

    // Medimos el contenedor padre (<li>), que NO se inclina: si midiéramos la
    // tarjeta ya girada, su caja cambiaría con cada giro y temblaría
    const box = card.parentElement.getBoundingClientRect();
    const x = pointer.x - box.left;
    const y = pointer.y - box.top;

    // -1 en un borde, 0 en el centro, 1 en el borde contrario
    const fromCenterX = (x - box.width / 2) / (box.width / 2);
    const fromCenterY = (y - box.height / 2) / (box.height / 2);

    // Arriba del centro la tarjeta se inclina hacia atrás (rotateX negativo)
    card.style.setProperty('--tilt-rx', `${(-fromCenterY * MAX_TILT_DEG).toFixed(2)}deg`);
    card.style.setProperty('--tilt-ry', `${(fromCenterX * MAX_TILT_DEG).toFixed(2)}deg`);
  }

  function handlePointerEnter(event) {
    if (!canTilt(event)) return;
    cardRef.current.dataset.tilt = 'active';
  }

  function handlePointerMove(event) {
    if (!canTilt(event)) return;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    if (!frameRef.current) frameRef.current = window.requestAnimationFrame(paintTilt);
  }

  function handlePointerLeave() {
    const card = cardRef.current;
    if (!card) return;

    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    pointerRef.current = null;

    // Vuelve al centro: el CSS lo anima con resorte
    card.dataset.tilt = 'idle';
    card.style.setProperty('--tilt-rx', '0deg');
    card.style.setProperty('--tilt-ry', '0deg');
  }

  return (
    <article
      ref={cardRef}
      className={`tilt-card ${className}`}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </article>
  );
}

export default TiltCard;
