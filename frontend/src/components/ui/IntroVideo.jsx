/* ==========================================================================
   PANTALLA DE CARGA CON VIDEO
   --------------------------------------------------------------------------
   Se muestra a pantalla completa cada vez que la página se carga desde cero
   (primera entrada o al recargar). Al navegar entre secciones no vuelve a
   salir, porque el componente vive en la raíz y solo se monta una vez.
   Se cierra al terminar el video, con el botón "Saltar", si el video falla
   o tras un tiempo máximo (por si la conexión es lenta).
   ========================================================================== */

import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import './IntroVideo.css';

/* Un video por tema: se usa el del tema activo al cargar la página */
const VIDEO_SRC = {
  dark: '/video/Grither_animacion_3s.mp4',
  light: '/video/Grither_animacion_claro_3s.mp4',
};

/* Tiempo máximo (ms) antes de cerrar aunque el video no haya terminado */
const MAX_DURATION = 6000;

/* Duración del desvanecimiento de salida (igual que en IntroVideo.css) */
const FADE_DURATION = 500;

/* Quien tiene activado "reducir movimiento" en su sistema no ve el video */
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function IntroVideo() {
  const { isDark } = useTheme();
  // Se fija al montar: si cambian el tema durante la intro, el video no se corta
  const [isDarkIntro] = useState(isDark);
  const [isVisible, setIsVisible] = useState(!prefersReducedMotion);
  const [isLeaving, setIsLeaving] = useState(false);

  /** Inicia el desvanecimiento y luego quita la pantalla */
  function close() {
    setIsLeaving(true);
  }

  // Seguro por si el video nunca termina (conexión lenta, autoplay bloqueado...)
  useEffect(() => {
    if (!isVisible) return undefined;
    const timer = setTimeout(close, MAX_DURATION);
    return () => clearTimeout(timer);
  }, [isVisible]);

  // Tras el desvanecimiento se desmonta del todo
  useEffect(() => {
    if (!isLeaving) return undefined;
    const timer = setTimeout(() => setIsVisible(false), FADE_DURATION);
    return () => clearTimeout(timer);
  }, [isLeaving]);

  // Mientras se ve la intro, la página de fondo no hace scroll
  useEffect(() => {
    if (!isVisible) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className={`intro-video ${isDarkIntro ? '' : 'intro-video--light'} ${isLeaving ? 'intro-video--leaving' : ''}`}
      aria-hidden="true"
    >
      <video
        className="intro-video__media"
        src={isDarkIntro ? VIDEO_SRC.dark : VIDEO_SRC.light}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={close}
        onError={close}
      />
      <button type="button" className="intro-video__skip" onClick={close} tabIndex={-1}>
        Saltar
      </button>
    </div>
  );
}

export default IntroVideo;
