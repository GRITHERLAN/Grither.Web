/* ==========================================================================
   SERVICIO DE PROYECTOS (CRUD con LocalStorage)
   --------------------------------------------------------------------------
   Hace el papel de "BackEnd": toda escritura de proyectos pasa por aquí y
   se VUELVE a validar (ID y nombre únicos, precio, enlace, etc.) aunque el
   formulario ya lo haya validado. Así se controla en FrontEnd y BackEnd.
   ========================================================================== */

import { readStorage, writeStorage, STORAGE_KEYS } from './storage.js';
import { AppError, ValidationError } from './errors.js';
import { getUserById, ROLES } from './authService.js';
import { isValidUrl, normalizeText } from '../utils/validators.js';

/* --------------------------------------------------------------------------
   Constantes del dominio
   -------------------------------------------------------------------------- */

/* Estados posibles de un proyecto */
export const PROJECT_STATUS = {
  ACTIVE: 'activo',
  INACTIVE: 'inactivo',
  CANCELLED: 'cancelado',
  COMPLETED: 'terminado', // entregado: sale de "Pendientes" y pasa a "Terminados"
};

/* Texto visible de cada estado */
export const STATUS_LABELS = {
  [PROJECT_STATUS.ACTIVE]: 'Activo',
  [PROJECT_STATUS.INACTIVE]: 'Inactivo',
  [PROJECT_STATUS.CANCELLED]: 'Cancelado',
  [PROJECT_STATUS.COMPLETED]: 'Terminado',
};

/* Fases del proceso de trabajo, en orden */
export const PROJECT_PHASES = [
  { value: 'reunion', label: 'Reunión' },
  { value: 'bocetos', label: 'Bocetos / prototipos' },
  { value: 'desarrollo', label: 'Desarrollo' },
  { value: 'despliegue', label: 'Despliegue' },
];

/* Categorías disponibles al crear un proyecto */
export const PROJECT_CATEGORIES = [
  'Landing page',
  'Sitio corporativo',
  'Web app / SaaS',
  'Web a la medida',
  'Soporte y mantenimiento',
];

/* Límites de texto */
const MIN_CANCEL_REASON = 10;

/* --------------------------------------------------------------------------
   Lectura
   -------------------------------------------------------------------------- */

/** Devuelve todos los proyectos guardados */
export function getProjects() {
  return readStorage(STORAGE_KEYS.PROJECTS, []);
}

/** Busca un proyecto por su ID (sin importar mayúsculas) */
export function getProjectById(projectId) {
  const wanted = normalizeText(projectId);
  return getProjects().find((project) => normalizeText(project.id) === wanted) || null;
}

/**
 * Proyectos de un cliente que puede ver en su panel (Panel Usuario):
 * los ACTIVOS y los TERMINADOS (estos últimos se muestran con su etiqueta).
 */
export function getActiveProjectsByClient(clientId) {
  return getProjects().filter(
    (project) =>
      project.clientId === clientId &&
      [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.COMPLETED].includes(project.status)
  );
}

/**
 * Devuelve el texto visible de una fase ("desarrollo" -> "Desarrollo").
 * Si el proyecto está TERMINADO, la fase final se muestra como "Desplegado".
 */
export function getPhaseLabel(phaseValue, status) {
  if (status === PROJECT_STATUS.COMPLETED && phaseValue === 'despliegue') return 'Desplegado';
  const phase = PROJECT_PHASES.find((item) => item.value === phaseValue);
  return phase ? phase.label : 'Sin fase';
}

/* --------------------------------------------------------------------------
   Comprobaciones de duplicados (las usa el formulario en vivo y el servicio)
   -------------------------------------------------------------------------- */

/**
 * ¿Ya existe otro proyecto con ese ID?
 * @param {string} id - ID a revisar.
 * @param {string|null} ignoreId - ID del proyecto en edición (no cuenta como duplicado).
 */
export function isProjectIdTaken(id, ignoreId = null) {
  const wanted = normalizeText(id);
  return getProjects().some(
    (project) =>
      normalizeText(project.id) === wanted &&
      (ignoreId === null || normalizeText(project.id) !== normalizeText(ignoreId))
  );
}

/** ¿Ya existe otro proyecto con ese nombre? (misma lógica que el ID) */
export function isProjectNameTaken(name, ignoreId = null) {
  const wanted = normalizeText(name);
  return getProjects().some(
    (project) =>
      normalizeText(project.name) === wanted &&
      (ignoreId === null || normalizeText(project.id) !== normalizeText(ignoreId))
  );
}

/**
 * Devuelve los IDs y nombres ya usados (normalizados) en dos Set.
 * RENDIMIENTO: el formulario lo llama UNA vez al abrirse y luego revisa
 * duplicados en memoria mientras se escribe, en vez de leer y convertir
 * todo LocalStorage (que incluye las imágenes) en cada tecla.
 * @param {string|null} ignoreId - Proyecto en edición (no cuenta como duplicado).
 */
export function getTakenProjectKeys(ignoreId = null) {
  const ignored = ignoreId === null ? null : normalizeText(ignoreId);
  const others = getProjects().filter((project) => normalizeText(project.id) !== ignored);
  return {
    ids: new Set(others.map((project) => normalizeText(project.id))),
    names: new Set(others.map((project) => normalizeText(project.name))),
  };
}

/* --------------------------------------------------------------------------
   Validación completa de un proyecto
   -------------------------------------------------------------------------- */

/**
 * Valida todos los campos de un proyecto.
 * @param {object} data - Datos del formulario.
 * @param {string|null} editingId - ID del proyecto si se está editando.
 * @returns {object} errores por campo (vacío = todo bien)
 */
export function validateProject(data, editingId = null) {
  const errors = {};

  // ID: obligatorio, solo letras, números y guiones, y único
  const id = String(data.id || '').trim();
  if (!id) {
    errors.id = 'El ID es obligatorio.';
  } else if (!/^[A-Za-z0-9-]{3,20}$/.test(id)) {
    errors.id = 'Usa de 3 a 20 caracteres: letras, números o guiones (ej. GTH-8050).';
  } else if (isProjectIdTaken(id, editingId)) {
    errors.id = 'Ya existe un proyecto con este ID.';
  }

  // Nombre: obligatorio y único
  const name = String(data.name || '').trim();
  if (name.length < 3) {
    errors.name = 'El nombre debe tener mínimo 3 caracteres.';
  } else if (name.length > 80) {
    errors.name = 'El nombre no puede superar 80 caracteres.';
  } else if (isProjectNameTaken(name, editingId)) {
    errors.name = 'Ya existe un proyecto con este nombre.';
  }

  // Descripción
  if (String(data.description || '').trim().length < 10) {
    errors.description = 'La descripción debe tener mínimo 10 caracteres.';
  }

  // Precio en pesos colombianos: número entero mayor a 0
  const price = Number(data.price);
  if (!Number.isFinite(price) || price <= 0) {
    errors.price = 'Escribe un precio mayor a 0.';
  } else if (!Number.isInteger(price)) {
    errors.price = 'El precio en COP no lleva decimales.';
  }

  // Categoría y fase deben ser de las listas permitidas
  if (!PROJECT_CATEGORIES.includes(data.category)) {
    errors.category = 'Selecciona una categoría.';
  }
  if (!PROJECT_PHASES.some((phase) => phase.value === data.phase)) {
    errors.phase = 'Selecciona la fase del proyecto.';
  }

  // Cliente: debe existir y tener rol de usuario
  const client = getUserById(data.clientId);
  if (!client || client.role !== ROLES.USER) {
    errors.clientId = 'Selecciona el usuario que contrató el proyecto.';
  }

  // Enlace del botón Contactar
  if (!isValidUrl(data.contactLink || '')) {
    errors.contactLink = 'Escribe un enlace válido (https://..., mailto:... o tel:...).';
  }

  return errors;
}

/* --------------------------------------------------------------------------
   Escritura (Crear / Editar / Borrar / Cambiar estado)
   -------------------------------------------------------------------------- */

/** Limpia y da formato a los datos que vienen del formulario */
function cleanProjectData(data) {
  return {
    id: String(data.id).trim().toUpperCase(),
    name: String(data.name).trim(),
    description: String(data.description).trim(),
    price: Number(data.price),
    category: data.category,
    phase: data.phase,
    clientId: data.clientId,
    contactLink: String(data.contactLink).trim(),
    media: Array.isArray(data.media) ? data.media : [],
  };
}

/** Busca la posición de un proyecto en la lista o lanza error si no existe */
function findProjectIndex(projects, projectId) {
  const index = projects.findIndex(
    (project) => normalizeText(project.id) === normalizeText(projectId)
  );
  if (index === -1) {
    throw new AppError('El proyecto ya no existe. Recarga la página.');
  }
  return index;
}

/**
 * Crea un proyecto nuevo.
 * - Estado inicial: ACTIVO (modo estándar).
 * - Fecha de creación: automática.
 */
export function createProject(data) {
  const errors = validateProject(data);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  const newProject = {
    ...cleanProjectData(data),
    status: PROJECT_STATUS.ACTIVE,
    cancelReason: '',
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };

  writeStorage(STORAGE_KEYS.PROJECTS, [...getProjects(), newProject]);
  return newProject;
}

/**
 * Edita un proyecto existente.
 * - El ID no cambia (es la llave del proyecto).
 * - La fecha de creación se conserva y la de edición se guarda sola.
 */
export function updateProject(projectId, data) {
  const projects = getProjects();
  const index = findProjectIndex(projects, projectId);
  const current = projects[index];

  // Forzamos el ID original para que nunca se cambie al editar
  const dataWithId = { ...data, id: current.id };
  const errors = validateProject(dataWithId, current.id);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  const updatedProject = {
    ...current,
    ...cleanProjectData(dataWithId),
    createdAt: current.createdAt, // se conserva siempre
    updatedAt: new Date().toISOString(), // automática
  };

  const nextProjects = [...projects];
  nextProjects[index] = updatedProject;
  writeStorage(STORAGE_KEYS.PROJECTS, nextProjects);
  return updatedProject;
}

/** Borra un proyecto definitivamente */
export function deleteProject(projectId) {
  const projects = getProjects();
  findProjectIndex(projects, projectId); // valida que exista
  writeStorage(
    STORAGE_KEYS.PROJECTS,
    projects.filter((project) => normalizeText(project.id) !== normalizeText(projectId))
  );
}

/**
 * Cambia el estado a ACTIVO o INACTIVO.
 * Al activar se borra la observación de cancelación (si la había).
 * También sirve para REABRIR un proyecto terminado (vuelve a Pendientes).
 */
export function setProjectStatus(projectId, status) {
  if (![PROJECT_STATUS.ACTIVE, PROJECT_STATUS.INACTIVE].includes(status)) {
    throw new AppError('Estado no permitido.');
  }

  const projects = getProjects();
  const index = findProjectIndex(projects, projectId);
  const nextProjects = [...projects];
  nextProjects[index] = {
    ...projects[index],
    status,
    cancelReason: status === PROJECT_STATUS.ACTIVE ? '' : projects[index].cancelReason,
    // Si el proyecto deja de estar terminado (reabrir), se borra su fecha de finalización
    completedAt: '',
    updatedAt: new Date().toISOString(),
  };
  writeStorage(STORAGE_KEYS.PROJECTS, nextProjects);
  return nextProjects[index];
}

/**
 * Marca un proyecto como TERMINADO (botón "Completado").
 * Pasa a la fase final (Despliegue), guarda la FECHA DE FINALIZACIÓN (ahora)
 * y se mueve a la sección "Terminados".
 * Un proyecto cancelado no se puede completar. Para devolverlo a
 * "Pendientes" se usa setProjectStatus(id, ACTIVO).
 */
export function completeProject(projectId) {
  const projects = getProjects();
  const index = findProjectIndex(projects, projectId);

  if (projects[index].status === PROJECT_STATUS.CANCELLED) {
    throw new AppError('Un proyecto cancelado no se puede completar. Actívalo primero.');
  }

  const nextProjects = [...projects];
  nextProjects[index] = {
    ...projects[index],
    status: PROJECT_STATUS.COMPLETED,
    phase: 'despliegue',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeStorage(STORAGE_KEYS.PROJECTS, nextProjects);
  return nextProjects[index];
}

/**
 * Cancela un proyecto. La observación es OBLIGATORIA.
 */
export function cancelProject(projectId, reason) {
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < MIN_CANCEL_REASON) {
    throw new ValidationError({
      reason: `Escribe la observación de cancelación (mínimo ${MIN_CANCEL_REASON} caracteres).`,
    });
  }

  const projects = getProjects();
  const index = findProjectIndex(projects, projectId);
  const nextProjects = [...projects];
  nextProjects[index] = {
    ...projects[index],
    status: PROJECT_STATUS.CANCELLED,
    cancelReason: cleanReason,
    updatedAt: new Date().toISOString(),
  };
  writeStorage(STORAGE_KEYS.PROJECTS, nextProjects);
  return nextProjects[index];
}
