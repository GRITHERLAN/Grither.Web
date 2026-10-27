/* ==========================================================================
   SERVICIO DE PROYECTOS (CRUD con Supabase)
   --------------------------------------------------------------------------
   Toda escritura de proyectos pasa por aquí y se VUELVE a validar (ID y
   nombre únicos, precio, enlace, etc.) aunque el formulario ya lo haya
   validado. Además, la base de datos tiene sus propias reglas:
     - ID: llave primaria (UNIQUE) y siempre en mayúsculas.
     - Nombre: índice UNIQUE (sin importar mayúsculas).
     - Fechas de creación/edición automáticas (trigger).
     - RLS: solo el Administrador crea, edita o borra; el cliente solo lee
       sus proyectos activos o terminados.
   Así la regla se controla en FrontEnd y en BackEnd.

   Las imágenes y videos se suben a Supabase Storage (bucket PRIVADO
   "project-media") y en la tabla project_media se guarda solo su RUTA.
   Al leer proyectos se piden URLs firmadas (vencen en 1 hora): Storage solo
   las entrega al admin o al cliente dueño del proyecto.
   Las fechas created_at, updated_at y completed_at las pone SIEMPRE la base
   de datos (trigger), aunque la app mande otra cosa.
   ========================================================================== */

import { supabase } from '../lib/supabaseClient.js';
import { AppError, ValidationError } from './errors.js';
import { toAppError } from './supabaseErrors.js';
import { BUCKETS, getSignedUrls, removeFiles, uploadFile } from './storageFiles.js';
import { getClients } from './authService.js';
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

/* Límites de texto */
const MIN_CANCEL_REASON = 10;

/* Columnas que se piden de cada proyecto (incluye su multimedia) */
const PROJECT_COLUMNS = '*, project_media(id, type, path, name, position)';

/* Mensaje cuando el proyecto no existe o no se puede ver */
const NOT_FOUND_MESSAGE = 'El proyecto ya no existe. Recarga la página.';

/* --------------------------------------------------------------------------
   Traducción entre la base de datos (snake_case) y la app (camelCase)
   -------------------------------------------------------------------------- */

/**
 * Convierte una fila de la tabla en el objeto de proyecto que usa la app.
 * @param {object} row - Fila de projects con su project_media.
 * @param {Map<string, string>} signedUrls - ruta -> URL firmada (de getSignedUrls).
 */
function toProject(row, signedUrls) {
  // La multimedia llega sin orden: se ordena por "position".
  // "src" es la URL firmada para mostrarla; "path" es la ruta que se guarda.
  const media = [...(row.project_media || [])]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      type: item.type,
      path: item.path,
      src: signedUrls.get(item.path) || '',
      name: item.name,
    }));

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    category: row.category,
    phase: row.phase,
    status: row.status,
    cancelReason: row.cancel_reason,
    clientId: row.client_id,
    contactLink: row.contact_link,
    media,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

/**
 * Convierte varias filas en proyectos, pidiendo en UNA sola petición las
 * URLs firmadas de toda su multimedia.
 */
async function toProjects(rows) {
  const paths = rows.flatMap((row) => (row.project_media || []).map((item) => item.path));
  const signedUrls = await getSignedUrls(BUCKETS.PROJECT_MEDIA, paths);
  return rows.map((row) => toProject(row, signedUrls));
}

/** Normaliza el ID como lo guarda la base de datos (sin espacios, en mayúsculas) */
function toDbId(projectId) {
  return String(projectId || '').trim().toUpperCase();
}

/* --------------------------------------------------------------------------
   Lectura
   (La RLS decide qué filas llegan: el admin ve todo, el cliente solo lo suyo.)
   -------------------------------------------------------------------------- */

/** Devuelve todos los proyectos que puede ver quien tiene la sesión */
export async function getProjects() {
  const { data, error } = await supabase.from('projects').select(PROJECT_COLUMNS).order('created_at');
  if (error) throw toAppError(error, 'No se pudieron cargar los proyectos.');
  return toProjects(data);
}

/** Busca un proyecto por su ID (sin importar mayúsculas). null si no existe o no se puede ver. */
export async function getProjectById(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_COLUMNS)
    .eq('id', toDbId(projectId))
    .maybeSingle();
  if (error) throw toAppError(error, 'No se pudo cargar el proyecto.');
  return data ? (await toProjects([data]))[0] : null;
}

/**
 * Proyectos de un cliente que puede ver en su panel (Panel Usuario):
 * los ACTIVOS y los TERMINADOS (estos últimos se muestran con su etiqueta).
 */
export async function getActiveProjectsByClient(clientId) {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_COLUMNS)
    .eq('client_id', clientId)
    .in('status', [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.COMPLETED])
    .order('created_at');
  if (error) throw toAppError(error, 'No se pudieron cargar tus proyectos.');
  return toProjects(data);
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
  const { data, error } = await supabase.from('projects').select('id, name');
  if (error) throw toAppError(error, 'No se pudieron revisar los proyectos existentes.');

  const ignored = ignoreId === null ? null : normalizeText(ignoreId);
  const others = data.filter((project) => normalizeText(project.id) !== ignored);
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
 * (en el mismo orden) con la ruta de cada uno.
 * Si una subida falla, borra lo que alcanzó a subir y lanza el error.
 * @returns {Promise<{items: Array, uploadedPaths: string[]}>}
 */
async function uploadNewMedia(projectId, media) {
  const uploadedPaths = [];
  const items = [];
  try {
    for (const item of media) {
      if (item.file) {
        const path = await uploadFile(BUCKETS.PROJECT_MEDIA, projectId, item.file);
        uploadedPaths.push(path);
        items.push({ type: item.type, path, name: item.name || '' });
      } else {
        items.push({ type: item.type, path: item.path, name: item.name || '' });
      }
    }
  } catch (error) {
    await removeFiles(BUCKETS.PROJECT_MEDIA, uploadedPaths);
    throw error;
  }
  return { items, uploadedPaths };
}

/** Reemplaza las filas de multimedia de un proyecto por la lista dada (en orden) */
async function replaceMediaRows(projectId, items) {
  const { error: deleteError } = await supabase.from('project_media').delete().eq('project_id', projectId);
  if (deleteError) throw toAppError(deleteError, 'No se pudieron actualizar las imágenes y videos.');

  if (items.length === 0) return;
  const rows = items.map((item, index) => ({
    project_id: projectId,
    type: item.type,
    path: item.path,
    name: item.name,
    position: index,
  }));
  const { error: insertError } = await supabase.from('project_media').insert(rows);
  if (insertError) throw toAppError(insertError, 'No se pudieron guardar las imágenes y videos.');
}

/* --------------------------------------------------------------------------
   Escritura (Crear / Editar / Borrar / Cambiar estado)
   -------------------------------------------------------------------------- */

/** Limpia y da formato a los datos que vienen del formulario */
function cleanProjectData(data) {
  return {
    id: toDbId(data.id),
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

/** Convierte los datos limpios en una fila de la tabla projects */
function toProjectRow(clean) {
  return {
    name: clean.name,
    description: clean.description,
    price: clean.price,
    category: clean.category,
    phase: clean.phase,
    client_id: clean.clientId,
    contact_link: clean.contactLink,
  };
}

/**
 * Actualiza columnas de un proyecto y devuelve el proyecto ya guardado.
 * Si no se actualizó ninguna fila (no existe o sin permiso) lanza un error claro.
 */
async function patchProject(projectId, patch, fallbackMessage) {
  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', toDbId(projectId))
    .select(PROJECT_COLUMNS)
    .maybeSingle();
  if (error) throw toAppError(error, fallbackMessage);
  if (!data) throw new AppError(NOT_FOUND_MESSAGE);
  return (await toProjects([data]))[0];
}

/**
 * Crea un proyecto nuevo.
 * - Estado inicial: ACTIVO (modo estándar).
 * - Fecha de creación: automática (la pone la base de datos).
 */
export async function createProject(data) {
  // "BackEnd": se vuelven a pedir los datos actuales para validar duplicados
  const [takenKeys, clients] = await Promise.all([getTakenProjectKeys(), getClients()]);
  const errors = validateProject(data, { takenKeys, clients });
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  const clean = cleanProjectData(data);

  // 1) Se crea la fila (si el ID o el nombre ya existen, la BD lo rechaza)
  const { error: insertError } = await supabase.from('projects').insert({
    id: clean.id,
    ...toProjectRow(clean),
    status: PROJECT_STATUS.ACTIVE,
    cancel_reason: '',
  });
  if (insertError) throw toAppError(insertError, 'No se pudo crear el proyecto.');

  // 2) Se suben los archivos y se guardan sus rutas.
  //    Si algo falla, se deshace todo para no dejar un proyecto a medias.
  if (clean.media.length > 0) {
    // Rutas ya subidas (si falla un paso posterior, también se borran)
    let uploadedPaths = [];
    try {
      const upload = await uploadNewMedia(clean.id, clean.media);
      uploadedPaths = upload.uploadedPaths;
      await replaceMediaRows(clean.id, upload.items);
    } catch (error) {
      await removeFiles(BUCKETS.PROJECT_MEDIA, uploadedPaths);
      await supabase.from('projects').delete().eq('id', clean.id);
      throw error instanceof AppError
        ? new AppError(`No se creó el proyecto: ${error.message}`)
        : toAppError(error, 'No se pudo crear el proyecto.');
    }
  }

  return getProjectById(clean.id);
}

/**
 * Edita un proyecto existente.
 * - El ID no cambia (es la llave del proyecto).
 * - La fecha de creación se conserva y la de edición se guarda sola (trigger).
 */
export async function updateProject(projectId, data) {
  const current = await getProjectById(projectId);
  if (!current) throw new AppError(NOT_FOUND_MESSAGE);

  // Forzamos el ID original para que nunca se cambie al editar
  const dataWithId = { ...data, id: current.id };
  const [takenKeys, clients] = await Promise.all([getTakenProjectKeys(current.id), getClients()]);
  const errors = validateProject(dataWithId, { takenKeys, clients });
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  const clean = cleanProjectData(dataWithId);

  // 1) Se suben primero los archivos nuevos (si falla, no se cambió nada)
  const { items, uploadedPaths } = await uploadNewMedia(current.id, clean.media);

  // 2) Se guardan los datos del proyecto y su lista de multimedia
  try {
    await patchProject(current.id, toProjectRow(clean), 'No se pudo guardar el proyecto.');
    await replaceMediaRows(current.id, items);
  } catch (error) {
    await removeFiles(BUCKETS.PROJECT_MEDIA, uploadedPaths);
    throw error;
  }

  // 3) Los archivos que se quitaron del proyecto se borran de Storage
  const keptPaths = new Set(items.map((item) => item.path));
  const removedPaths = current.media.map((item) => item.path).filter((path) => !keptPaths.has(path));
  await removeFiles(BUCKETS.PROJECT_MEDIA, removedPaths);

  return getProjectById(current.id);
}

/** Borra un proyecto definitivamente (y sus imágenes y videos) */
export async function deleteProject(projectId) {
  const current = await getProjectById(projectId);
  if (!current) throw new AppError(NOT_FOUND_MESSAGE);

  // Las filas de project_media se borran solas (ON DELETE CASCADE)
  const { error } = await supabase.from('projects').delete().eq('id', current.id);
  if (error) throw toAppError(error, 'No se pudo borrar el proyecto.');

  await removeFiles(
    BUCKETS.PROJECT_MEDIA,
    current.media.map((item) => item.path)
  );
}

/**
 * Cambia el estado a ACTIVO o INACTIVO.
 * Al activar se borra la observación de cancelación (si la había).
 * También sirve para REABRIR un proyecto terminado (vuelve a Pendientes).
 */
export async function setProjectStatus(projectId, status) {
  if (![PROJECT_STATUS.ACTIVE, PROJECT_STATUS.INACTIVE].includes(status)) {
    throw new AppError('Estado no permitido.');
  }

  // La fecha de finalización la borra sola la base de datos (trigger) al reabrir
  const patch = { status };
  if (status === PROJECT_STATUS.ACTIVE) patch.cancel_reason = '';

  return patchProject(projectId, patch, 'No se pudo cambiar el estado del proyecto.');
}

/**
 * Marca un proyecto como TERMINADO (botón "Completado").
 * Pasa a la fase final (Despliegue), guarda la FECHA DE FINALIZACIÓN (ahora)
 * y se mueve a la sección "Terminados".
 * Un proyecto cancelado no se puede completar. Para devolverlo a
 * "Pendientes" se usa setProjectStatus(id, ACTIVO).
 */
export async function completeProject(projectId) {
  const current = await getProjectById(projectId);
  if (!current) throw new AppError(NOT_FOUND_MESSAGE);

  if (current.status === PROJECT_STATUS.CANCELLED) {
    throw new AppError('Un proyecto cancelado no se puede completar. Actívalo primero.');
  }

  return patchProject(
    current.id,
    // La fecha de finalización (completed_at) la marca sola la base de datos (trigger)
    { status: PROJECT_STATUS.COMPLETED, phase: 'despliegue' },
    'No se pudo completar el proyecto.'
  );
}

/**
 * Cancela un proyecto. La observación es OBLIGATORIA.
 */
export async function cancelProject(projectId, reason) {
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < MIN_CANCEL_REASON) {
    throw new ValidationError({
      reason: `Escribe la observación de cancelación (mínimo ${MIN_CANCEL_REASON} caracteres).`,
    });
  }
  if (cleanReason.length > MAX_LENGTH.CANCEL_REASON) {
    throw new ValidationError({
      reason: `La observación puede tener máximo ${MAX_LENGTH.CANCEL_REASON} caracteres.`,
    });
  }

  return patchProject(
    projectId,
    { status: PROJECT_STATUS.CANCELLED, cancel_reason: cleanReason },
    'No se pudo cancelar el proyecto.'
  );
}
