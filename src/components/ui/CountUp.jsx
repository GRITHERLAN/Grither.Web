/* ==========================================================================
   NÚMERO QUE CUENTA HACIA ARRIBA (CountUp)
   --------------------------------------------------------------------------
   Muestra un valor como "+30", "100%" o "4" contando desde 0 cuando entra
   en pantalla. Se usa en los indicadores ("En cifras").

   - Solo anima si el texto es: prefijo opcional + número entero + sufijo
     opcional (ej. "+30", "100%", "24h"). Cualquier otro formato se muestra
     tal cual, sin animar.
   - El movimiento es un resorte "críticamente amortiguado" (sin rebote):
     arranca rápido y frena suave al llegar, como los de Apple.
   - Accesibilidad: el lector de pantalla lee solo el valor final (los
     números intermedios van con aria-hidden). Con "reducir movimiento"
     activado se muestra el valor final directamente.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react';

/* "Response" del resorte en segundos: cuánto tarda en llegar casi al final */
const SPRING_RESPONSE = 0.9;

/**
 * Separa el texto en prefijo, número y sufijo. Devuelve null si no se puede
 * animar. Ej: "+30" -> { prefix: "+", target: 30, suffix: "" }
 */
function parseValue(value) {
  const match = /^(\D*)(\d+)(\D*)$/.exec(String(value).trim());
  if (!match) return null;
  return { prefix: match[1], target: Number(match[2]), suffix: match[3] };
}

/**
 * Posición de un resorte sin rebote en el instante t (segundos), de 0 a 1.
 * Fórmula de un resorte críticamente amortiguado: 1 - (1 + ωt)·e^(-ωt)
 */
function springProgress(t) {
  const omega = (2 * Math.PI) / SPRING_RESPONSE;
  return 1 - (1 + omega * t) * Math.exp(-omega * t);
}

/** @param {string} value - Texto del indicador, ej. "+30" */
function CountUp({ value }) {
  const parsed = parseValue(value);
  const elementRef = useRef(null);
  // Número que se ve en este momento (empieza en 0 si se puede animar)
  const [current, setCurrent] = useState(parsed ? 0 : null);

  useEffect(() => {
    if (!parsed) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      setCurrent(parsed.target);
      return undefined;
    }

    let frameId = 0;

    /** Cuenta de 0 al valor final, un paso por fotograma */
    function startCounting() {
      const startTime = performance.now();

      function step(now) {
        const seconds = (now - startTime) / 1000;
        const progress = springProgress(seconds);

        // Al 99.9 % ya no se nota la diferencia: fijamos el valor exacto
        if (progress >= 0.999) {
          setCurrent(parsed.target);
          return;
        }

        setCurrent(Math.round(parsed.target * progress));
        frameId = window.requestAnimationFrame(step);
      }

      frameId = window.requestAnimationFrame(step);
    }

    // Empieza a contar cuando el número asoma en pantalla (una sola vez)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        startCounting();
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
    // parsed se recalcula en cada render; basta con depender del texto original
  }, [value]);

  // Formato que no se puede animar: se muestra tal cual
  if (!parsed) return <span>{value}</span>;

  return (
    <span ref={elementRef}>
      <span aria-hidden="true">
        {parsed.prefix}
        {current}
        {parsed.suffix}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}

export default CountUp;
