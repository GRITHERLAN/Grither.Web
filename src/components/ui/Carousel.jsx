/* ==========================================================================
   CARRUSEL DE IMÁGENES Y VIDEOS
   --------------------------------------------------------------------------
   Muestra un archivo a la vez con flechas para avanzar/retroceder, puntos
   para saltar a uno específico y soporte de teclado (← →).
   Si el proyecto no tiene archivos, muestra el logo como marcador.
   Movimiento: el archivo nuevo entra desde el lado hacia el que se avanza
   (data-direction + motion.css).
   ========================================================================== */

import { useState } from 'react';
import Icon from './Icon.jsx';
import Logo from '../layout/Logo.jsx';
import './Carousel.css';

/**
 * @param {Array<{type:'image'|'video', src:string, name?:string}>} media
 * @param {string} title - Nombre del proyecto (para los textos alternativos).
 */
function Carousel({ media = [], title }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Hacia dónde se movió el usuario: 'next' (entra por la derecha) o 'prev'.
  // Empieza vacío para que el primer archivo no se deslice al cargar.
  const [direction, setDirection] = useState('');
  const total = media.length;

  // ---------- Sin archivos: marcador con el logo ----------
  if (total === 0) {
    return (
      <figure className="carousel carousel--empty">
        <Logo variant="emblem" />
        <figcaption className="carousel__empty-text">Aún no hay imágenes de este proyecto</figcaption>
      </figure>
    );
  }

  /** Va al anterior (si está en el primero, salta al último) */
  function goPrevious(event) {
    event.preventDefault();
    setDirection('prev');
    setCurrentIndex((index) => (index - 1 + total) % total);
  }

  /** Va al siguiente (si está en el último, vuelve al primero) */
  function goNext(event) {
    event.preventDefault();
    setDirection('next');
    setCurrentIndex((index) => (index + 1) % total);
  }

  /** Flechas del teclado cuando el carrusel tiene el foco */
  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') goPrevious(event);
    if (event.key === 'ArrowRight') goNext(event);
  }

  // Si la lista cambió y el índice quedó por fuera, usamos el último válido
  const safeIndex = Math.min(currentIndex, total - 1);
  const currentItem = media[safeIndex];

  return (
    <section
      className="carousel"
      aria-roledescription="carrusel"
      aria-label={`Imágenes y videos de ${title}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Archivo actual */}
      <figure className="carousel__slide" data-direction={direction || undefined}>
        {currentItem.type === 'video' ? (
          <video key={safeIndex} className="carousel__media" src={currentItem.src} controls />
        ) : (
          <img
            // key: cada imagen es un elemento nuevo, así su animación de entrada se repite
            key={safeIndex}
            className="carousel__media"
            src={currentItem.src}
            alt={`${title} - imagen ${safeIndex + 1} de ${total}`}
          />
        )}
        <figcaption className="carousel__counter text-mono">
          {safeIndex + 1} / {total}
        </figcaption>
      </figure>

      {/* Flechas: solo si hay más de un archivo */}
      {total > 1 && (
        <>
          <button
            type="button"
            className="carousel__arrow carousel__arrow--prev"
            aria-label="Anterior"
            onClick={goPrevious}
          >
            <Icon name="chevronLeft" />
          </button>
          <button
            type="button"
            className="carousel__arrow carousel__arrow--next"
            aria-label="Siguiente"
            onClick={goNext}
          >
            <Icon name="chevronRight" />
          </button>

          {/* Puntos indicadores */}
          <ol className="carousel__dots">
            {media.map((item, index) => (
              <li key={`${item.name || 'archivo'}-${index}`}>
                <button
                  type="button"
                  className={`carousel__dot ${index === safeIndex ? 'carousel__dot--active' : ''}`}
                  aria-label={`Ir al archivo ${index + 1}`}
                  aria-current={index === safeIndex}
                  onClick={(event) => {
                    event.preventDefault();
                    // El punto elegido está a la derecha o a la izquierda del actual
                    setDirection(index > safeIndex ? 'next' : 'prev');
                    setCurrentIndex(index);
                  }}
                />
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

export default Carousel;
