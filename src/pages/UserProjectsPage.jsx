/* ==========================================================================
   PÁGINA: PANEL USUARIO (opción "Proyecto")
   --------------------------------------------------------------------------
   Muestra SOLO los proyectos ACTIVOS que pertenecen al cliente con sesión.
   ========================================================================== */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getActiveProjectsByClient } from '../services/projectService.js';
import ProjectCard from '../components/projects/ProjectCard.jsx';
import './UserProjectsPage.css';

function UserProjectsPage() {
  const { user } = useAuth();
  const projects = getActiveProjectsByClient(user.id);

  return (
    <div className="container">
      <header className="user-projects__header">
        <span className="eyebrow">Panel de cliente</span>
        <h1 className="user-projects__title">Hola, {user.name}</h1>
        <p className="text-muted">Aquí puedes seguir el avance de tus proyectos activos con Grither.</p>
      </header>

      <section className="section" aria-labelledby="my-projects-title">
        <header className="section__header">
          <h2 id="my-projects-title" className="section__title">
            Mis proyectos
          </h2>
          <p className="section__meta">
            {projects.length} {projects.length === 1 ? 'proyecto activo' : 'proyectos activos'}
          </p>
        </header>

        {projects.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">Aún no tienes proyectos activos</p>
            <p>Cuando el equipo de Grither active tu proyecto lo verás aquí.</p>
            <Link to="/contacto" className="btn btn--primary btn--sm">
              Cotizar un proyecto
            </Link>
          </div>
        ) : (
          <ul className="user-projects__grid">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default UserProjectsPage;
