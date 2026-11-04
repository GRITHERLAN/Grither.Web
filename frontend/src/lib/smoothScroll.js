/* ==========================================================================
   SCROLL SUAVE (Lenis)
   --------------------------------------------------------------------------
   Con la rueda del ratón el navegador salta de golpe ~100px por "clic".
   Lenis intercepta la rueda y lleva la página hasta ese punto con inercia,
   un poco en cada fotograma. Sigue siendo el scroll real de la ventana:
   el header sticky, los IntersectionObserver de motion y la barra de scroll
   funcionan igual que antes.

     - En pantallas táctiles NO se toca nada: el scroll nativo del celular ya
       tiene inercia y suavizarlo otra vez se siente pesado.
     - Con "reducir movimiento" en el sistema, Lenis se desactiva solo.
     - Si la página está bloqueada (body con overflow: hidden, ej. el video
       de carga) Lenis no mueve nada.
     - Los paneles con scroll propio llevan data-lenis-prevent para que la
       rueda los mueva a ellos y no a la página.

   Lo usan usePublicMotion (arranca/para) y quien necesite desplazarse por
   código (scrollToTop, scrollToElement), para no pelear con la inercia.
   ========================================================================== */

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/* Instancia única: solo hay una ventana que desplazar */
let lenis = null;

/** Activa el scroll suave (si ya está activo no hace nada) */
export function startSmoothScroll() {
  if (lenis) return;

  lenis = new Lenis({
    autoRaf: true, // Lenis se encarga de su propio requestAnimationFrame
    lerp: 0.1, // 10% del camino restante por fotograma: llega rápido y frena suave
    smoothWheel: true,
    syncTouch: false, // táctil = scroll nativo
    // Página bloqueada (video de carga, etc.): dejamos que el navegador decida
    virtualScroll: () => document.body.style.overflow !== 'hidden',
  });
}

/** Desactiva el scroll suave y devuelve el control al navegador */
export function stopSmoothScroll() {
  lenis?.destroy();
  lenis = null;
}

/** Sube al inicio al instante, cortando la inercia que quedara pendiente */
export function scrollToTop() {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true, force: true });
  } else {
    window.scrollTo(0, 0);
  }
}

/** Baja suavemente hasta "element" (respeta su scroll-margin-top) */
export function scrollToElement(element) {
  if (!element) return;

  if (lenis) {
    lenis.scrollTo(element, { duration: 1.1 });
  } else {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}
