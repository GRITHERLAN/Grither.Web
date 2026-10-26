/* ==========================================================================
   PÁGINA: SOBRE NOSOTROS
   --------------------------------------------------------------------------
   Secciones (todo editable desde el panel admin, menos tecnologías):
     1. Héroe con la descripción de la marca y el emblema.
     2. Indicadores.
     3. Nuestro proceso: Reunión, Bocetos/prototipos, Desarrollo, Despliegue.
     4. Quién está detrás de la marca + tecnologías.
     5. Llamado a la acción.
   ========================================================================== */

import { Link } from 'react-router-dom';
import Logo from '../components/layout/Logo.jsx';
import IndicatorGrid from '../components/ui/IndicatorGrid.jsx';
import { getAboutInfo } from '../services/siteInfoService.js';
import { PROJECT_PHASES } from '../services/projectService.js';
import { TECHNOLOGIES } from '../data/siteContent.js';
import { getInitials } from '../utils/format.js';
import './AboutPage.css';

function AboutPage() {
  // Leemos la información guardada por el admin
  const about = getAboutInfo();

  // La descripción puede tener varios párrafos separados por línea en blanco
  const paragraphs = about.brandDescription.split(/\n\s*\n/).filter(Boolean);

  return (
    <div className="container">
      {/* ---------- 1. Héroe ---------- */}
      <section className="about-hero">
        <div className="about-hero__content">
          <span className="eyebrow">Sobre nosotros</span>
          <h1 className="about-hero__title">
            Le damos alas <span className="text-gradient">a las ideas digitales.</span>
          </h1>
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="about-hero__text">
              {paragraph}
            </p>
          ))}
        </div>

        <figure className="about-hero__emblem">
          <Logo variant="emblem" />
        </figure>
      </section>

      {/* ---------- 2. Indicadores ---------- */}
      <section className="section" aria-labelledby="about-indicators">
        <header className="section__header">
          <h2 id="about-indicators" className="section__title">
            En cifras
          </h2>
        </header>
        <IndicatorGrid indicators={about.indicators} />
      </section>

      {/* ---------- 3. Proceso de trabajo ---------- */}
      <section className="section" aria-labelledby="about-process">
        <header className="section__header">
          <div>
            <h2 id="about-process" className="section__title">
              Nuestro proceso
            </h2>
            <p className="section__subtitle">Así trabajamos desde la firma del contrato hasta el lanzamiento.</p>
          </div>
          <p className="section__meta">{PROJECT_PHASES.length} fases · entregas por etapa</p>
        </header>

        <ol className="process-grid">
          {PROJECT_PHASES.map((phase, index) => (
            <li key={phase.value} className={`card process-card process-card--${index + 1}`}>
              <span className="process-card__number">{index + 1}</span>
              <h3 className="process-card__title">{phase.label}</h3>
              <p className="process-card__text">{about.phases[phase.value]}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- 4. Quién está detrás + tecnologías ---------- */}
      <section className="section about-team" aria-labelledby="about-owner">
        <article className="card owner-card">
          {about.owner.photo ? (
            <img className="owner-card__photo" src={about.owner.photo} alt={`Foto de ${about.owner.name}`} />
          ) : (
            <span className="owner-card__photo owner-card__photo--initials" aria-hidden="true">
              {getInitials(about.owner.name)}
            </span>
          )}
          <div className="owner-card__info">
            <p className="eyebrow">Quién está detrás</p>
            <h2 id="about-owner" className="owner-card__name">
              {about.owner.name}
            </h2>
            <p className="owner-card__role text-mono">{about.owner.role}</p>
            <p className="owner-card__bio">{about.owner.bio}</p>
          </div>
        </article>

        <article className="card">
          <h2 className="owner-card__tech-title">Tecnologías con las que trabajamos</h2>
          <ul className="tag-list">
            {TECHNOLOGIES.map((technology) => (
              <li key={technology} className="tag text-mono">
                {technology}
              </li>
            ))}
          </ul>
        </article>
      </section>

      {/* ---------- 5. Llamado a la acción ---------- */}
      <section className="section about-cta">
        <div>
          <h2 className="about-cta__title">¿Tienes un proyecto en mente?</h2>
          <p className="text-muted">Agenda una llamada gratuita de 20 minutos.</p>
        </div>
        <Link to="/contacto" className="btn btn--primary">
          Hablemos
        </Link>
      </section>
    </div>
  );
}

export default AboutPage;
