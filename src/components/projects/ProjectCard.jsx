/* ==========================================================================
   TARJETA DE PROYECTO (Panel Usuario)
   --------------------------------------------------------------------------
   Muestra la portada, datos principales, fase actual y dos botones:
     - "Ver avance": abre la página de detalle del proyecto.
     - "Contactar":  abre el enlace configurado por el administrador.
   ========================================================================== */

import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import Logo from '../layout/Logo.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import { PROJECT_STATUS } from '../../services/projectService.js';
import PhaseStepper from '../ui/PhaseStepper.jsx';
import { formatCOP } from '../../utils/format.js';
import './ProjectCard.css';

function ProjectCard({ project }) {
  // La portada es la primera imagen del proyecto (si tiene)
  const coverImage = project.media.find((item) => item.type === 'image');

  return (
    <article className="card project-card">
      <figure className="project-card__cover">
        {coverImage ? (
          <img src={coverImage.src} alt={`Portada de ${project.name}`} />
        ) : (
          <span className="project-card__placeholder">
            <Logo variant="emblem" />
          </span>
        )}
      </figure>

      <div className="project-card__body">
        <header className="project-card__header">
          <p className="project-card__id text-mono">{project.id}</p>
          <span className="tag">{project.category}</span>
        </header>

        {/* Los proyectos entregados se marcan como "Terminado" */}
        {project.status === PROJECT_STATUS.COMPLETED && (
          <p className="project-card__status">
            <StatusBadge status={project.status} />
          </p>
        )}

        <h3 className="project-card__title">{project.name}</h3>
        <p className="project-card__description">{project.description}</p>

        <p className="project-card__price text-mono">
          {formatCOP(project.price)} <span>COP</span>
        </p>

        <PhaseStepper
          currentPhase={project.phase}
          isCompleted={project.status === PROJECT_STATUS.COMPLETED}
          compact
        />

        <footer className="project-card__actions">
          <Link to={`/proyecto/${encodeURIComponent(project.id)}`} className="btn btn--primary btn--sm">
            <Icon name="eye" className="project-card__btn-icon" />
            Ver avance
          </Link>
          <a
            href={project.contactLink}
            className="btn btn--outline btn--sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="mail" className="project-card__btn-icon" />
            Contactar
          </a>
        </footer>
      </div>
    </article>
  );
}

export default ProjectCard;
