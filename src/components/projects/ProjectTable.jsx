/* ==========================================================================
   TABLA DE PROYECTOS (Panel Admin)
   --------------------------------------------------------------------------
   Columnas: Proyecto, Cliente, Categoría / fase, Precio COP, Estado, Fecha
   y Acciones:
     - Ver avance (ojo)
     - Editar (lápiz)
   En "Pendientes" (isCompletedList = false):
     - Completado (pasa el proyecto a "Terminados")
     - Inactivar / Activar (según el estado actual)
     - Cancelar (pide observación) — no aparece si ya está cancelado
   En "Terminados" (isCompletedList = true):
     - Reabrir (lo devuelve a "Pendientes")
   - Borrar (papelera) en ambas listas
   En celulares cada fila se convierte en una tarjeta (ver CSS).
   ========================================================================== */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import { PROJECT_STATUS, getPhaseLabel } from '../../services/projectService.js';
import { formatCOP, formatDate } from '../../utils/format.js';
import './ProjectTable.css';

/**
 * @param {Array} projects - Proyectos ya filtrados y ordenados.
 * @param {number} totalCount - Total sin filtrar (para "Mostrando X de Y").
 * @param {object} clientsById - Mapa { idUsuario: usuario } para mostrar el cliente.
 * @param {boolean} isCompletedList - true en la sección "Terminados".
 * @param {function} onEdit, onToggleStatus, onComplete, onReopen, onCancel, onDelete - Acciones.
 */
function ProjectTable({
  projects,
  totalCount,
  clientsById,
  isCompletedList = false,
  onEdit,
  onToggleStatus,
  onComplete,
  onReopen,
  onCancel,
  onDelete,
}) {
  /** Envuelve cada acción para prevenir el comportamiento por defecto del clic */
  function handleAction(event, action, project) {
    event.preventDefault();
    action(project);
  }

  return (
    <section className="card project-table" aria-label="Lista de proyectos">
      <p className="project-table__summary">
        Mostrando {projects.length} de {totalCount} proyectos
      </p>

      {projects.length === 0 ? (
        <div className="empty-state project-table__empty">
          <p className="empty-state__title">
            {totalCount === 0 && isCompletedList ? 'Aún no hay proyectos terminados' : 'No hay proyectos con estos filtros'}
          </p>
          <p>
            {totalCount === 0 && isCompletedList
              ? 'Cuando marques un proyecto como "Completado" aparecerá aquí.'
              : 'Prueba cambiando la búsqueda o limpiando los filtros.'}
          </p>
        </div>
      ) : (
        <div className="project-table__scroll">
          <table className="project-table__table">
            <thead>
              <tr>
                <th scope="col">Proyecto</th>
                <th scope="col">Cliente</th>
                <th scope="col">Categoría / fase</th>
                <th scope="col" className="project-table__num">Precio COP</th>
                <th scope="col">Estado</th>
                <th scope="col">Fecha</th>
                <th scope="col" className="project-table__actions-head">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const client = clientsById[project.clientId];
                const isInactive = project.status === PROJECT_STATUS.INACTIVE;
                const isCancelled = project.status === PROJECT_STATUS.CANCELLED;

                return (
                  <tr key={project.id}>
                    {/* data-label se usa en celular para mostrar el título de cada dato */}
                    <td data-label="Proyecto">
                      <p className="project-table__id text-mono">{project.id}</p>
                      <p className="project-table__name">{project.name}</p>
                      {isCancelled && project.cancelReason && (
                        <p className="project-table__reason">Motivo: {project.cancelReason}</p>
                      )}
                    </td>
                    <td data-label="Cliente">{client ? client.name : 'Usuario eliminado'}</td>
                    <td data-label="Categoría / fase">
                      {/* Se agrupan para que en celular queden juntos a la derecha */}
                      <div>
                        <span className="tag">{project.category}</span>
                        <p className="project-table__phase">{getPhaseLabel(project.phase, project.status)}</p>
                      </div>
                    </td>
                    <td data-label="Precio COP" className="project-table__num text-mono">
                      {formatCOP(project.price)}
                    </td>
                    <td data-label="Estado">
                      <StatusBadge status={project.status} />
                    </td>
                    <td data-label="Fecha" className="text-mono project-table__date">
                      {formatDate(project.createdAt)}
                    </td>
                    <td data-label="Acciones">
                      <div className="project-table__actions">
                        {/* Fila 1: botones con texto (cambian el estado del proyecto) */}
                        <div className="project-table__actions-row">
                          {isCompletedList ? (
                            /* Terminados: solo se puede reabrir (vuelve a Pendientes) */
                            <button
                              type="button"
                              className="btn btn--sm btn--soft project-table__status-btn"
                              onClick={(event) => handleAction(event, onReopen, project)}
                            >
                              <Icon name="play" className="project-table__btn-icon" />
                              Reabrir
                            </button>
                          ) : (
                            <>
                              {/* Completado: no aparece en proyectos cancelados */}
                              {!isCancelled && (
                                <button
                                  type="button"
                                  className="btn btn--sm btn--primary project-table__status-btn"
                                  onClick={(event) => handleAction(event, onComplete, project)}
                                >
                                  <Icon name="check" className="project-table__btn-icon" />
                                  Completado
                                </button>
                              )}

                              {/* Inactivo -> botón Activar. Activo o Cancelado -> Inactivar / Reactivar */}
                              <button
                                type="button"
                                className={`btn btn--sm ${isInactive || isCancelled ? 'btn--soft' : 'btn--outline'} project-table__status-btn`}
                                onClick={(event) => handleAction(event, onToggleStatus, project)}
                              >
                                <Icon name={isInactive || isCancelled ? 'play' : 'pause'} className="project-table__btn-icon" />
                                {isInactive && 'Activar'}
                                {isCancelled && 'Reactivar'}
                                {!isInactive && !isCancelled && 'Inactivar'}
                              </button>
                            </>
                          )}
                        </div>

                        {/* Fila 2: iconos (ver avance, editar, cancelar, borrar) */}
                        <div className="project-table__actions-row">
                          <Link
                            to={`/proyecto/${encodeURIComponent(project.id)}`}
                            className="icon-btn"
                            aria-label={`Ver avance de ${project.name}`}
                            title="Ver avance"
                          >
                            <Icon name="eye" />
                          </Link>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`Editar ${project.name}`}
                            title="Editar"
                            onClick={(event) => handleAction(event, onEdit, project)}
                          >
                            <Icon name="edit" />
                          </button>
                          {!isCompletedList && !isCancelled && (
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              aria-label={`Cancelar ${project.name}`}
                              title="Cancelar proyecto"
                              onClick={(event) => handleAction(event, onCancel, project)}
                            >
                              <Icon name="ban" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="icon-btn icon-btn--danger"
                            aria-label={`Borrar ${project.name}`}
                            title="Borrar"
                            onClick={(event) => handleAction(event, onDelete, project)}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// memo: solo se vuelve a dibujar si cambian sus props (RENDIMIENTO)
export default memo(ProjectTable);
