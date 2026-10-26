/* ==========================================================================
   PÁGINA: VER AVANCE DE UN PROYECTO
   --------------------------------------------------------------------------
   Muestra:
     - Carrusel de imágenes y/o videos del proyecto.
     - ID y nombre del proyecto, descripción, precio (COP) y categoría.
     - Fase en la que está el proyecto.
     - Botón Contactar (enlace configurado por el administrador).
   Acceso:
     - Cliente: solo si el proyecto es suyo y está ACTIVO.
     - Administrador: cualquier proyecto.
   ========================================================================== */

import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getProjectById, getPhaseLabel, PROJECT_STATUS } from '../services/projectService.js';
import { getAboutInfo } from '../services/siteInfoService.js';
import Carousel from '../components/ui/Carousel.jsx';
import PhaseStepper from '../components/ui/PhaseStepper.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import Icon from '../components/ui/Icon.jsx';
import { formatCOP, formatDate } from '../utils/format.js';
import './ProjectProgressPage.css';

function ProjectProgressPage() {
  const { projectId } = useParams();
  const { user, isAdmin } = useAuth();
  const project = getProjectById(projectId);

  // ¿Puede ver este proyecto quien tiene la sesión?
  const canView =
    project && (isAdmin || (project.clientId === user.id && [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.COMPLETED].includes(project.status)));

  // Ruta para volver según el rol
  const backPath = isAdmin ? '/administrador' : '/proyecto';
  const backLabel = isAdmin ? 'Volver al panel' : 'Volver a mis proyectos';

  if (!canView) {
    return (
      <div className="container">
        <div className="empty-state">
          <p className="empty-state__title">No encontramos este proyecto</p>
          <p>Puede que no exista, que no esté activo o que no pertenezca a tu cuenta.</p>
          <Link to={backPath} className="btn btn--primary btn--sm">
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  // Explicación de la fase actual (la misma que se ve en Sobre nosotros)
  const phaseText = getAboutInfo().phases[project.phase];

  return (
    <div className="container">
      <Link to={backPath} className="progress__back">
        <Icon name="arrowLeft" /> {backLabel}
      </Link>

      <article className="progress">
        {/* ---------- Carrusel ---------- */}
        <Carousel media={project.media} title={project.name} />

        {/* ---------- Información ---------- */}
        <section className="progress__info">
          <p className="progress__id text-mono">{project.id}</p>
          <h1 className="progress__title">{project.name}</h1>

          {/* El admin también ve el estado (el cliente solo ve activos) */}
          {isAdmin && (
            <div>
              <StatusBadge status={project.status} />
            </div>
          )}

          <p className="progress__description">{project.description}</p>

          <dl className="progress__data">
            <div>
              <dt>Precio</dt>
              <dd className="progress__price text-mono">
                {formatCOP(project.price)} <span>COP</span>
              </dd>
            </div>
            <div>
              <dt>Categoría</dt>
              <dd>{project.category}</dd>
            </div>
            <div>
              <dt>Fase actual</dt>
              <dd>{getPhaseLabel(project.phase, project.status)}</dd>
            </div>
            <div>
              <dt>Fecha de creación</dt>
              <dd className="text-mono">{formatDate(project.createdAt)}</dd>
            </div>
            {/* Solo en proyectos terminados: la fecha en que se marcó "Completado"
                (si es un proyecto antiguo sin fecha guardada, se usa la última actualización) */}
            {project.status === PROJECT_STATUS.COMPLETED && (
              <div>
                <dt>Fecha de finalización</dt>
                <dd className="text-mono">{formatDate(project.completedAt || project.updatedAt)}</dd>
              </div>
            )}
          </dl>

          <a
            href={project.contactLink}
            className="btn btn--primary btn--block"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="mail" className="progress__btn-icon" />
            Contactar
          </a>
        </section>
      </article>

      {/* ---------- Fases ---------- */}
      <section className="card progress__phases" aria-labelledby="phase-title">
        <header className="progress__phases-header">
          <h2 id="phase-title" className="section__title">
            Fase del proyecto
          </h2>
          <p className="text-muted">{phaseText}</p>
        </header>
        <PhaseStepper currentPhase={project.phase} isCompleted={project.status === PROJECT_STATUS.COMPLETED} />
      </section>
    </div>
  );
}

export default ProjectProgressPage;
