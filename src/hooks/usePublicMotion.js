/* ==========================================================================
   MOVIMIENTO DEL SITIO PÚBLICO (usePublicMotion)
   --------------------------------------------------------------------------
   Se usa en PublicLayout y en la página de Ingresar. El panel administrativo
   NO lo usa, así que allí no hay animaciones de scroll ni brillos.

   Hace tres cosas:
     1. Marca <html data-motion="public">: los estilos de styles/motion.css
        solo se aplican con esa marca.
     2. Aparición al hacer scroll: tarjetas y bloques empiezan ocultos
        (data-reveal="hidden") y al entrar en pantalla pasan a "shown"; el CSS
        los hace subir y aparecer. Si entran varios a la vez, salen en cascada.
     3. Foco neón: guarda la posición del puntero dentro de la tarjeta en las
        variables --spot-x / --spot-y; el CSS dibuja un brillo verde ahí.

   Accesibilidad: con "reducir movimiento" activado en el sistema no se
   oculta nada (todo se ve desde el principio) y no hay brillo que persiga
   al puntero.
   ========================================================================== */

import { useLayoutEffect } from 'react';

/* Elementos que aparecen al hacer scroll */
const REVEAL_SELECTOR = [
  '.card',
  '.section__header',
  '.indicator-grid__item',
  '.about-cta',
  '.portfolio-cta',
  '.empty-state',
].join(', ');

/* Bloques del inicio de cada página: ya entran con su propia animación en
   CSS (motion.css), así que sus hijos no se ocultan otra vez */
const HERO_SELECTOR = [
  '.services-hero',
  '.portfolio-hero',
  '.about-hero',
  '.contact-info',
  '.user-projects__header',
  '.progress__info',
  '.auth-page__intro',
].join(', ');

/* Elementos que llevan el brillo neón que sigue al puntero */
const SPOTLIGHT_SELECTOR = '.card, .indicator-grid__item, .contact-card';

/* Cascada: cada elemento que entra a la vez espera 70 ms más que el anterior,
   con un máximo para que el último no se haga esperar */
const STAGGER_MS = 70;
const MAX_STAGGER_MS = 350;

export function usePublicMotion() {
  // useLayoutEffect (y no useEffect) para ocultar los elementos ANTES de que
  // el navegador pinte: así no se ven un instante y luego desaparecen
  useLayoutEffect(() => {
    const html = document.documentElement;
    const appRoot = document.getElementById('root');
    html.dataset.motion = 'public';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------- 1. Aparición al hacer scroll ---------- */
    let revealObserver = null;
    let mutationObserver = null;

    if (!prefersReducedMotion && 'IntersectionObserver' in window && appRoot) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          // "order" cuenta cuántos entraron en esta misma tanda (para la cascada)
          let order = 0;
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const element = entry.target;
            const delay = Math.min(order * STAGGER_MS, MAX_STAGGER_MS);
            element.style.setProperty('--reveal-delay', `${delay}ms`);
            element.dataset.reveal = 'shown';
            order += 1;

            // Ya apareció: no hace falta seguir vigilándolo
            revealObserver.unobserve(element);
          });
        },
        // threshold 0: basta con que asome. El margen inferior negativo hace
        // que aparezca cuando ya subió un poco, no justo en el borde
        { threshold: 0, rootMargin: '0px 0px -8% 0px' }
      );

      /** Busca dentro de "node" los elementos a animar y los deja ocultos */
      function prepare(node) {
        if (!(node instanceof Element)) return;

        const targets = Array.from(node.querySelectorAll(REVEAL_SELECTOR));
        if (node.matches(REVEAL_SELECTOR)) targets.push(node);

        targets.forEach((element) => {
          // Los que ya aparecieron no se vuelven a esconder
          if (element.dataset.reveal === 'shown') return;
          if (element.closest(HERO_SELECTOR)) return;

          element.dataset.reveal = 'hidden';
          revealObserver.observe(element);
        });
      }

      // Lo que ya está en la página...
      prepare(appRoot);

      // ...y lo que llegue después (datos de Supabase, cambio de página,
      // filtros del portafolio). El MutationObserver avisa antes de pintar.
      mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => mutation.addedNodes.forEach(prepare));
      });
      mutationObserver.observe(appRoot, { childList: true, subtree: true });
    }

    /* ---------- 2. Foco neón que sigue al puntero ---------- */
    let frameId = 0;
    let lastPointer = null;

    /** Escribe la posición del puntero en la tarjeta (una vez por fotograma) */
    function paintSpotlight() {
      frameId = 0;
      if (!lastPointer) return;

      const { card, x, y } = lastPointer;
      const box = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${x - box.left}px`);
      card.style.setProperty('--spot-y', `${y - box.top}px`);
    }

    function handlePointerMove(event) {
      // Solo con ratón: en pantallas táctiles no hay "puntero flotando"
      if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) return;

      const card = event.target.closest(SPOTLIGHT_SELECTOR);
      if (!card) return;

      lastPointer = { card, x: event.clientX, y: event.clientY };
      // requestAnimationFrame agrupa muchos movimientos en un solo cambio por fotograma
      if (!frameId) frameId = window.requestAnimationFrame(paintSpotlight);
    }

    if (canHover && !prefersReducedMotion) {
      document.addEventListener('pointermove', handlePointerMove, { passive: true });
    }

    /* ---------- Limpieza al salir del sitio público ---------- */
    return () => {
      delete html.dataset.motion;
      revealObserver?.disconnect();
      mutationObserver?.disconnect();
      document.removeEventListener('pointermove', handlePointerMove);
      if (frameId) window.cancelAnimationFrame(frameId);

      // Lo que quedó oculto se muestra (por si el componente se monta otra vez)
      document.querySelectorAll('[data-reveal="hidden"]').forEach((element) => {
        delete element.dataset.reveal;
      });
    };
  }, []);
}
