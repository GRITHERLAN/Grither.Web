/* ==========================================================================
   SERVICIO DE PROYECTOS (CRUD con la API)
   --------------------------------------------------------------------------
   Fuente de datos: la API del backend (/api/projects).
   El backend decide quién ve qué (el admin todo; el cliente solo sus
   proyectos activos o terminados), vuelve a validar cada escritura (ID y
   nombre únicos, precio, enlace...) y pone las fechas de creación, edición
   y finalización. Aquí se valida antes solo para mostrar los errores al
   instante mientras se escribe.

   Las imágenes y videos se suben a Storage (bucket PRIVADO "project-media")
   con un permiso del backend, y a la API se manda solo su RUTA. Para verlos,
   el backend devuelve cada archivo con una URL firmada (vence en 1 hora).
   ========================================================================== */

import { apiRequest } from './apiClient.js';
import { BUCKETS, uploadFile } from './storageFiles.js';
import { MAX_LENGTH, isTooLong, isValidUrl, normalizeText } from '../utils/validators.js';

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

/* Categorías disponibles al crear un proyecto
   (si se agrega una, también hay que agregarla en el CHECK de la tabla projects) */
export const PROJECT_CATEGORIES = [
  'Landing page',
  'Sitio corporativo',
  'Web app / SaaS',
  'Web a la medida',
  'Soporte y mantenimiento',
];

/* La traducción fila de la BD <-> objeto de la app (y las URLs firmadas de
   la multimedia) ahora vive en el backend: backend/src/models/project.model.js */

/** Normaliza el ID como lo guarda la base de datos (sin espacios, en mayúsculas) */
function toDbId(projectId) {
  return String(projectId || '').trim().toUpperCase();
}

/* --------------------------------------------------------------------------
   Lectura
   (El backend decide qué proyectos llegan: el admin ve todo, el cliente solo lo suyo.)
   -------------------------------------------------------------------------- */

/**
 * Devuelve los proyectos que puede ver quien tiene la sesión.
 * El backend filtra: el admin recibe todos; el cliente, solo sus proyectos
 * ACTIVOS y TERMINADOS (por eso el Panel Usuario usa esta misma función).
 */
export async function getProjects() {
  return apiRequest('/api/projects');
}

/** Busca un proyecto por su ID (sin importar mayúsculas). null si no existe o no se puede ver. */
export async function getProjectById(projectId) {
  try {
    return await apiRequest(`/api/projects/${encodeURIComponent(toDbId(projectId))}`);
  } catch (error) {
    // 404 = no existe o no es tuyo: la pantalla muestra "no encontrado"
    if (error.status === 404) return null;
    throw error;
  }
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
   Comprobaciones de duplicados
   -------------------------------------------------------------------------- */

/**
 * Devuelve los IDs y nombres ya usados (normalizados) en dos Set.
 * RENDIMIENTO: el formulario lo llama UNA vez al abrirse y luego revisa
 * duplicados en memoria mientras se escribe, sin ir a internet en cada tecla.
 * Solo pide las columnas id y name (nada de imágenes).
 * @param {string|null} ignoreId - Proyecto en edición (no cuenta como duplicado).
 */
export async function getTakenProjectKeys(ignoreId = null) {
  const query = ignoreId === null ? '' : `?ignoreId=${encodeURIComponent(ignoreId)}`;
  const keys = await apiRequest(`/api/projects/taken-keys${query}`);

  // La API manda listas; el formulario las usa como Set (buscar es más rápido)
  return { ids: new Set(keys.ids), names: new Set(keys.names) };
}

/* --------------------------------------------------------------------------
   Validación completa de un proyecto
   -------------------------------------------------------------------------- */

/**
 * Valida todos los campos de un proyecto.
 * Es una función PURA (no lee nada guardado): recibe como datos lo que
 * necesita para revisar duplicados y el cliente. Así el formulario la puede
 * usar en cada tecla sin esperar a internet.
 * @param {object} data - Datos del formulario.
 * @param {object} context
 * @param {{ids:Set,names:Set}} context.takenKeys - IDs y nombres ya usados (de getTakenProjectKeys).
 * @param {Array} context.clients - Usuarios con rol cliente (de getClients).
 * @returns {object} errores por campo (vacío = todo bien)
 */
export function validateProject(data, { takenKeys, clients } = {}) {
  const errors = {};

  // ID: obligatorio, solo letras, números y guiones, y único
  const id = String(data.id || '').trim();
  if (!id) {
    errors.id = 'El ID es obligatorio.';
  } else if (!/^[A-Za-z0-9-]{3,20}$/.test(id)) {
    errors.id = 'Usa de 3 a 20 caracteres: letras, números o guiones (ej. GTH-8050).';
  } else if (takenKeys && takenKeys.ids.has(normalizeText(id))) {
    errors.id = 'Ya existe un proyecto con este ID.';
  }

  // Nombre: obligatorio y único
  const name = String(data.name || '').trim();
  if (name.length < 3) {
    errors.name = 'El nombre debe tener mínimo 3 caracteres.';
  } else if (name.length > MAX_LENGTH.PROJECT_NAME) {
    errors.name = `El nombre no puede superar ${MAX_LENGTH.PROJECT_NAME} caracteres.`;
  } else if (takenKeys && takenKeys.names.has(normalizeText(name))) {
    errors.name = 'Ya existe un proyecto con este nombre.';
  }

  // Descripción
  if (String(data.description || '').trim().length < 10) {
    errors.description = 'La descripción debe tener mínimo 10 caracteres.';
  } else if (isTooLong(data.description, MAX_LENGTH.PROJECT_DESCRIPTION)) {
    errors.description = `La descripción puede tener máximo ${MAX_LENGTH.PROJECT_DESCRIPTION} caracteres.`;
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

  // Cliente: debe estar en la lista de clientes (usuarios con rol cliente)
  const clientExists = Array.isArray(clients)
    ? clients.some((client) => client.id === data.clientId)
    : Boolean(data.clientId);
  if (!clientExists) {
    errors.clientId = 'Selecciona el usuario que contrató el proyecto.';
  }

  // Enlace del botón Contactar
  if (!isValidUrl(data.contactLink || '') || isTooLong(data.contactLink, MAX_LENGTH.URL)) {
    errors.contactLink = 'Escribe un enlace válido (https://..., mailto:... o tel:...).';
  }

  return errors;
}

/* --------------------------------------------------------------------------
   Multimedia (Storage + tabla project_media)
   --------------------------------------------------------------------------
   En el formulario cada archivo es un objeto:
     - Ya guardado: { id, type, path (ruta en Storage), src (URL firmada), name }
     - Nuevo:       { type, src (vista previa local), name, file (Blob) }
   -------------------------------------------------------------------------- */

/**
 * Sube a Storage los archivos NUEVOS de la lista y devuelve la lista final
 * (en el mismo orden) con la ruta de cada uno: { type, path, name }.
 * Si la API después no puede guardar, el backend borra los archivos nuevos.
 */
async function uploadNewMedia(projectId, media) {
  const items = [];
  for (const item of media) {
    // Ya guardado: se conserva su ruta. Nuevo: se sube primero.
    const path = item.file ? await uploadFile(BUCKETS.PROJECT_MEDIA, projectId, item.file) : item.path;
    items.push({ type: item.type, path, name: item.name || '' });
  }
  return items;
}

/** Limpia y da formato a los datos que vienen del formulario */
function cleanProjectData(data, media) {
  return {
    id: toDbId(data.id),
    name: String(data.name).trim(),
    description: String(data.description).trim(),
    price: Number(data.price),
    category: data.category,
    phase: data.phase,
    clientId: data.clientId,
    contactLink: String(data.contactLink).trim(),
    media,
  };
}

/* --------------------------------------------------------------------------
   Escritura (solo Administrador: lo revisa el backend)
   -------------------------------------------------------------------------- */

/** Crea un proyecto nuevo (el backend lo deja ACTIVO y pone la fecha de creación) */
export async function createProject(data) {
  const projectId = toDbId(data.id);
  const media = await uploadNewMedia(projectId, Array.isArray(data.media) ? data.media : []);
  return apiRequest('/api/projects', { method: 'POST', body: cleanProjectData(data, media) });
}

/** Edita un proyecto existente (el ID no cambia; la fecha de edición la pone el backend) */
export async function updateProject(projectId, data) {
  const id = toDbId(projectId);
  const media = await uploadNewMedia(id, Array.isArray(data.media) ? data.media : []);
  return apiRequest(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: cleanProjectData({ ...data, id }, media),
  });
}

/** Borra un proyecto definitivamente (el backend borra también sus imágenes y videos) */
export async function deleteProject(projectId) {
  await apiRequest(`/api/projects/${encodeURIComponent(toDbId(projectId))}`, { method: 'DELETE' });
}

/**
 * Cambia el estado a ACTIVO o INACTIVO.
 * También sirve para REABRIR un proyecto terminado (vuelve a Pendientes).
 */
export async function setProjectStatus(projectId, status) {
  return apiRequest(`/api/projects/${encodeURIComponent(toDbId(projectId))}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

/**
 * Marca un proyecto como TERMINADO (botón "Completado"): pasa a la fase
 * final y el backend guarda la fecha de finalización.
 */
export async function completeProject(projectId) {
  return apiRequest(`/api/projects/${encodeURIComponent(toDbId(projectId))}/complete`, { method: 'POST' });
}

/** Cancela un proyecto. La observación es OBLIGATORIA (la revisa el backend). */
export async function cancelProject(projectId, reason) {
  return apiRequest(`/api/projects/${encodeURIComponent(toDbId(projectId))}/cancel`, {
    method: 'POST',
    body: { reason },
  });
}
