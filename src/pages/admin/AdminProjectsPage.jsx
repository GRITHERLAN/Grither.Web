/* ==========================================================================
   PANEL ADMIN: PROYECTOS (CRUD)
   --------------------------------------------------------------------------
   Une todas las piezas:
     - Tarjetas resumen.
     - Filtros.
     - Tabla con acciones.
     - Ventanas: crear/editar, cancelar (con observación) y borrar.
   La misma página sirve para dos secciones del menú "Proyectos":
     - Pendientes (isCompletedList = false): todo lo que no está terminado.
     - Terminados (isCompletedList = true): los marcados como "Completado".
   Después de cada cambio se vuelven a leer los proyectos de LocalStorage.
   ========================================================================== */

import { useCallback, useMemo, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import {
  getProjects,
  deleteProject,
  setProjectStatus,
  completeProject,
  PROJECT_STATUS,
} from '../../services/projectService.js';
import { getClients, getUsers } from '../../services/authService.js';
import { filterProjects, countByStatus, DEFAULT_FILTERS } from '../../utils/filterProjects.js';
import SummaryCards from '../../components/projects/SummaryCards.jsx';
import ProjectFilters from '../../components/projects/ProjectFilters.jsx';
import ProjectTable from '../../components/projects/ProjectTable.jsx';
import ProjectForm from '../../components/projects/ProjectForm.jsx';
import CancelProjectDialog from '../../components/projects/CancelProjectDialog.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Icon from '../../components/ui/Icon.jsx';

/**
 * @param {boolean} isCompletedList - true muestra la sección "Terminados".
 */
function AdminProjectsPage({ isCompletedList = false }) {
  const { showToast } = useToast();

  // ---------- Datos ----------
  const [allProjects, setAllProjects] = useState(getProjects);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // ---------- Ventanas abiertas ----------
  // formState: null (cerrado) | { project: null } (crear) | { project } (editar)
  const [formState, setFormState] = useState(null);
  const [projectToCancel, setProjectToCancel] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);

  /*
    RENDIMIENTO:
    - Los datos derivados se guardan con useMemo y las funciones que reciben
      la tabla, los filtros y las tarjetas con useCallback.
    - Esos tres componentes están envueltos en React.memo, así que al abrir o
      cerrar una ventana (que solo cambia formState, projectToCancel...) NO se
      vuelven a dibujar: solo se dibuja la ventana.
  */

  // Clientes para el formulario y mapa id -> usuario para la tabla.
  // Se vuelven a leer solo cuando cambian los proyectos (al guardar algo).
  const clients = useMemo(() => getClients(), [allProjects]);
  const clientsById = useMemo(
    () => Object.fromEntries(getUsers().map((user) => [user.id, user])),
    [allProjects]
  );

  // Proyectos de ESTA sección: Terminados o Pendientes (todo lo demás)
  const projects = useMemo(
    () =>
      allProjects.filter(
        (project) => (project.status === PROJECT_STATUS.COMPLETED) === isCompletedList
      ),
    [allProjects, isCompletedList]
  );

  // Lista filtrada y ordenada (solo se recalcula si cambian datos o filtros)
  const visibleProjects = useMemo(() => filterProjects(projects, filters), [projects, filters]);
  const counts = useMemo(() => countByStatus(projects), [projects]);

  /** Vuelve a leer los proyectos guardados */
  const reloadProjects = useCallback(() => {
    setAllProjects(getProjects());
  }, []);

  // ---------- Filtros ----------
  const handleFiltersChange = useCallback((changes) => {
    setFilters((current) => ({ ...current, ...changes }));
  }, []);

  const handleFiltersReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // ---------- Abrir ventanas desde la tabla ----------
  const handleEdit = useCallback((project) => setFormState({ project }), []);

  // ---------- Crear / Editar ----------
  function handleOpenCreate(event) {
    event.preventDefault();
    setFormState({ project: null });
  }

  function handleSaved(savedProject) {
    const wasEditing = Boolean(formState?.project);
    setFormState(null);
    reloadProjects();
    showToast(
      wasEditing
        ? `Proyecto ${savedProject.id} actualizado.`
        : `Proyecto ${savedProject.id} creado en estado Activo.`
    );
  }

  // ---------- Activar / Inactivar ----------
  const handleToggleStatus = useCallback((project) => {
    // Inactivo o Cancelado -> Activo. Activo -> Inactivo.
    const nextStatus =
      project.status === PROJECT_STATUS.ACTIVE ? PROJECT_STATUS.INACTIVE : PROJECT_STATUS.ACTIVE;

    try {
      setProjectStatus(project.id, nextStatus);
      reloadProjects();
      showToast(
        nextStatus === PROJECT_STATUS.ACTIVE
          ? `Proyecto ${project.id} activado.`
          : `Proyecto ${project.id} pasó a Inactivo.`,
        nextStatus === PROJECT_STATUS.ACTIVE ? 'success' : 'info'
      );
    } catch (error) {
      showToast(error.message, 'error');
    }
  }, [reloadProjects, showToast]);

  // ---------- Completado / Reabrir ----------
  const handleComplete = useCallback((project) => {
    try {
      completeProject(project.id);
      reloadProjects();
      showToast(`Proyecto ${project.id} completado. Lo encuentras en "Terminados".`);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }, [reloadProjects, showToast]);

  const handleReopen = useCallback((project) => {
    try {
      setProjectStatus(project.id, PROJECT_STATUS.ACTIVE);
      reloadProjects();
      showToast(`Proyecto ${project.id} reabierto. Volvió a "Pendientes".`, 'info');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }, [reloadProjects, showToast]);

  // ---------- Cancelar ----------
  function handleCancelled(cancelledProject) {
    setProjectToCancel(null);
    reloadProjects();
    showToast(`Proyecto ${cancelledProject.id} cancelado.`, 'info');
  }

  // ---------- Borrar ----------
  function handleConfirmDelete() {
    try {
      deleteProject(projectToDelete.id);
      showToast(`Proyecto ${projectToDelete.id} borrado.`, 'info');
    } catch (error) {
      showToast(error.message, 'error');
    }
    setProjectToDelete(null);
    reloadProjects();
  }

  return (
    <>
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">{isCompletedList ? 'Proyectos terminados' : 'Proyectos pendientes'}</h1>
          <p className="admin-header__text">
            {isCompletedList
              ? 'Proyectos entregados. Puedes consultarlos, editarlos o reabrirlos.'
              : 'Gestiona el portafolio, los estados y la facturación.'}
          </p>
        </div>
        {/* Los proyectos nuevos nacen activos, así que solo se crean desde Pendientes */}
        {!isCompletedList && (
          <button type="button" className="btn btn--primary" onClick={handleOpenCreate}>
            <Icon name="plus" className="admin-header__btn-icon" />
            Nuevo proyecto
          </button>
        )}
      </header>

      {!isCompletedList && <SummaryCards projects={projects} />}

      <ProjectFilters
        filters={filters}
        onChange={handleFiltersChange}
        onReset={handleFiltersReset}
        counts={counts}
        hideStatus={isCompletedList}
      />

      <ProjectTable
        projects={visibleProjects}
        totalCount={projects.length}
        clientsById={clientsById}
        isCompletedList={isCompletedList}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        onComplete={handleComplete}
        onReopen={handleReopen}
        onCancel={setProjectToCancel}
        onDelete={setProjectToDelete}
      />

      {/* ---------- Ventana crear / editar ---------- */}
      <Modal
        isOpen={Boolean(formState)}
        onClose={() => setFormState(null)}
        title={formState?.project ? `Editar ${formState.project.id}` : 'Nuevo proyecto'}
        description={
          formState?.project ? 'Actualiza la información del proyecto.' : 'Completa los datos para crear el proyecto.'
        }
        size="lg"
      >
        {formState && (
          <ProjectForm
            project={formState.project}
            clients={clients}
            onSaved={handleSaved}
            onCancel={() => setFormState(null)}
          />
        )}
      </Modal>

      {/* ---------- Ventana cancelar ---------- */}
      <CancelProjectDialog
        project={projectToCancel}
        onClose={() => setProjectToCancel(null)}
        onCancelled={handleCancelled}
      />

      {/* ---------- Confirmación borrar ---------- */}
      <ConfirmDialog
        isOpen={Boolean(projectToDelete)}
        title="Borrar proyecto"
        message={
          projectToDelete
            ? `¿Seguro que quieres borrar "${projectToDelete.name}" (${projectToDelete.id})? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Sí, borrar"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </>
  );
}

export default AdminProjectsPage;
