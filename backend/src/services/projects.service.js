/* ==========================================================================
   SERVICIO DE PROYECTOS
   --------------------------------------------------------------------------
   Quién ve qué (antes lo decía la RLS de la tabla projects):
     - El administrador ve y edita todos los proyectos.
     - El cliente solo VE sus proyectos activos o terminados.

   Fechas (antes las ponía el trigger projects_set_timestamps):
     - created_at: al crear (y nunca cambia).
     - updated_at: cada vez que se edita.
     - completed_at: cuando pasa a "terminado"; se borra si se reabre.

   Multimedia: el navegador sube cada archivo a "project-media/<ID>/" con
   un permiso de /api/uploads, y aquí llega la lista de rutas. Si guardar
   falla, los archivos nuevos se borran para no dejar basura en Storage.
   ========================================================================== */

import { supabase } from '../database/supabase.js';
import { HttpError, throwIfInvalid } from '../utils/HttpError.js';
import { check } from '../utils/dbErrors.js';
import { MAX_LENGTH, cleanText, isTooLong, isValidUrl, normalizeText } from '../utils/validators.js';
import { ROLES } from '../models/user.model.js';
import {
  PROJECT_CATEGORIES,
  PROJECT_COLUMNS,
  PROJECT_PHASES,
  PROJECT_STATUS,
  toMediaRows,
  toProject,
  toProjectRow,
} from '../models/project.model.js';
import { BUCKETS, getSignedUrls, isPathInFolder, removeFiles } from './storage.service.js';

const NOT_FOUND_MESSAGE = 'El proyecto ya no existe. Recarga la página.';
const MAX_MEDIA_ITEMS = 8;
const MIN_CANCEL_REASON = 10;

/* Estados que un cliente puede ver */
const CLIENT_VISIBLE_STATUS = [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.COMPLETED];

/* --------------------------------------------------------------------------
   Utilidades internas
   -------------------------------------------------------------------------- */

/** Normaliza el ID como lo guarda la base de datos (sin espacios, en mayúsculas) */
function toDbId(projectId) {
  return cleanText(projectId).toUpperCase();
}

/** Convierte varias filas en proyectos, firmando en UNA petición todas sus URLs */
async function toProjects(rows) {
  const paths = rows.flatMap((row) => (row.project_media || []).map((item) => item.path));
  const signedUrls = await getSignedUrls(BUCKETS.PROJECT_MEDIA, paths);
  return rows.map((row) => toProject(row, signedUrls));
}

/** Lee un proyecto sin revisar permisos (uso interno). null si no existe */
async function findProject(projectId) {
  const row = check(
    await supabase.from('projects').select(PROJECT_COLUMNS).eq('id', toDbId(projectId)).maybeSingle(),
    'No se pudo cargar el proyecto.'
  );
  return row ? (await toProjects([row]))[0] : null;
}

/** Igual que findProject, pero lanza 404 si no existe */
async function findProjectOrFail(projectId) {
  const project = await findProject(projectId);
  if (!project) throw new HttpError(404, NOT_FOUND_MESSAGE);
  return project;
}

/** ¿Este usuario puede ver este proyecto? (la misma regla que tenía la RLS) */
function canSeeProject(user, project) {
  if (user.role === ROLES.ADMIN) return true;
  return project.clientId === user.id && CLIENT_VISIBLE_STATUS.includes(project.status);
}

/**
 * Calcula las fechas de una edición (antes: trigger projects_set_timestamps).
 * @param {object} current - Proyecto como está hoy.
 * @param {string} nextStatus - Estado que tendrá después de guardar.
 */
function getUpdateTimestamps(current, nextStatus) {
  const now = new Date().toISOString();
  let completedAt = null; // reabierto, activo, inactivo o cancelado
  if (nextStatus === PROJECT_STATUS.COMPLETED) {
    // Se acaba de completar -> ahora; ya estaba terminado -> se conserva la fecha
    completedAt = current.status === PROJECT_STATUS.COMPLETED ? current.completedAt : now;
  }
  return { updated_at: now, completed_at: completedAt };
}

/** Guarda cambios de un proyecto (con sus fechas) y lo devuelve actualizado */
async function patchProject(current, patch, fallback) {
  const nextStatus = patch.status || current.status;
  const changes = { ...patch, ...getUpdateTimestamps(current, nextStatus) };
  check(await supabase.from('projects').update(changes).eq('id', current.id), fallback);
  return findProjectOrFail(current.id);
}

/* --------------------------------------------------------------------------
   Lectura
   -------------------------------------------------------------------------- */

/** Proyectos que puede ver quien llama, del más antiguo al más nuevo */
export async function listProjects(user) {
  let query = supabase.from('projects').select(PROJECT_COLUMNS).order('created_at');
  if (user.role !== ROLES.ADMIN) {
    query = query.eq('client_id', user.id).in('status', CLIENT_VISIBLE_STATUS);
  }
  const rows = check(await query, 'No se pudieron cargar los proyectos.');
  return toProjects(rows);
}

/** Un proyecto, solo si quien llama puede verlo (si no, 404: ni se dice que existe) */
export async function getProject(user, projectId) {
  const project = await findProject(projectId);
  if (!project || !canSeeProject(user, project)) throw new HttpError(404, NOT_FOUND_MESSAGE);
  return project;
}

/**
 * IDs y nombres ya usados (normalizados), para que el formulario revise
 * duplicados en memoria mientras se escribe.
 * @param {string|null} ignoreId - Proyecto en edición (no cuenta como duplicado).
 */
export async function getTakenKeys(ignoreId = null) {
  const rows = check(await supabase.from('projects').select('id, name'), 'No se pudieron revisar los proyectos existentes.');
  const ignored = ignoreId ? normalizeText(ignoreId) : null;
  const others = rows.filter((row) => normalizeText(row.id) !== ignored);
  return {
    ids: others.map((row) => normalizeText(row.id)),
    names: others.map((row) => normalizeText(row.name)),
  };
}

/* --------------------------------------------------------------------------
   Validación
   -------------------------------------------------------------------------- */

/** Ids de los usuarios con rol cliente (a quienes se les puede asignar un proyecto) */
async function getClientIds() {
  const rows = check(
    await supabase.from('profiles').select('id').eq('role', ROLES.USER),
    'No se pudieron cargar los clientes.'
  );
  return rows.map((row) => row.id);
}

/** Revisa ID y nombre: forma y que no estén repetidos */
function validateIdAndName(clean, takenKeys, errors) {
  if (!clean.id) errors.id = 'El ID es obligatorio.';
  else if (!/^[A-Z0-9-]{3,20}$/.test(clean.id)) errors.id = 'Usa de 3 a 20 caracteres: letras, números o guiones (ej. GTH-8050).';
  else if (takenKeys.ids.includes(normalizeText(clean.id))) errors.id = 'Ya existe un proyecto con este ID.';

  if (clean.name.length < 3) errors.name = 'El nombre debe tener mínimo 3 caracteres.';
  else if (clean.name.length > MAX_LENGTH.PROJECT_NAME) errors.name = `El nombre no puede superar ${MAX_LENGTH.PROJECT_NAME} caracteres.`;
  else if (takenKeys.names.includes(normalizeText(clean.name))) errors.name = 'Ya existe un proyecto con este nombre.';
}

/** Revisa la lista de multimedia: máximo 8 y cada ruta dentro de la carpeta del proyecto */
function validateMedia(projectId, media, errors) {
  if (!Array.isArray(media)) {
    errors.media = 'La lista de imágenes y videos no es válida.';
    return;
  }
  if (media.length > MAX_MEDIA_ITEMS) errors.media = `Máximo ${MAX_MEDIA_ITEMS} archivos por proyecto.`;
  const isValidItem = (item) =>
    ['image', 'video'].includes(item?.type) && isPathInFolder(item.path, projectId) && String(item.name ?? '').length <= 255;
  if (!media.every(isValidItem)) errors.media = 'Algún archivo no es válido. Vuelve a subirlo.';
}

/**
 * Valida todos los campos del proyecto.
 * @param {object} clean - Datos ya limpios (cleanProjectData).
 * @param {string|null} ignoreId - Proyecto en edición (para los duplicados).
 */
async function validateProject(clean, ignoreId) {
  const [takenKeys, clientIds] = await Promise.all([getTakenKeys(ignoreId), getClientIds()]);
  const errors = {};

  validateIdAndName(clean, takenKeys, errors);

  if (clean.description.length < 10) errors.description = 'La descripción debe tener mínimo 10 caracteres.';
  else if (isTooLong(clean.description, MAX_LENGTH.PROJECT_DESCRIPTION)) {
    errors.description = `La descripción puede tener máximo ${MAX_LENGTH.PROJECT_DESCRIPTION} caracteres.`;
  }

  // Precio en pesos colombianos: número entero mayor a 0
  if (!Number.isFinite(clean.price) || clean.price <= 0) errors.price = 'Escribe un precio mayor a 0.';
  else if (!Number.isInteger(clean.price)) errors.price = 'El precio en COP no lleva decimales.';

  if (!PROJECT_CATEGORIES.includes(clean.category)) errors.category = 'Selecciona una categoría.';
  if (!PROJECT_PHASES.includes(clean.phase)) errors.phase = 'Selecciona la fase del proyecto.';
  if (!clientIds.includes(clean.clientId)) errors.clientId = 'Selecciona el usuario que contrató el proyecto.';
  if (!isValidUrl(clean.contactLink) || isTooLong(clean.contactLink, MAX_LENGTH.URL)) {
    errors.contactLink = 'Escribe un enlace válido (https://..., mailto:... o tel:...).';
  }

  validateMedia(clean.id, clean.media, errors);
  throwIfInvalid(errors);
}

/** Limpia y da formato a los datos que vienen del formulario */
function cleanProjectData(data) {
  return {
    id: toDbId(data.id),
    name: cleanText(data.name),
    description: cleanText(data.description),
    price: Number(data.price),
    category: data.category,
    phase: data.phase,
    clientId: data.clientId,
    contactLink: cleanText(data.contactLink),
    media: Array.isArray(data.media)
      ? data.media.map((item) => ({ type: item?.type, path: item?.path, name: cleanText(item?.name) }))
      : data.media,
  };
}

/** Rutas que se pueden borrar sin peligro: solo las de la carpeta de ESTE proyecto */
function ownPaths(projectId, media) {
  if (!Array.isArray(media)) return [];
  return media.map((item) => item?.path).filter((path) => isPathInFolder(path, projectId));
}

/* --------------------------------------------------------------------------
   Escritura (solo Administrador)
   -------------------------------------------------------------------------- */

/** Crea un proyecto nuevo (estado inicial: activo) con su multimedia */
export async function createProject(data) {
  const clean = cleanProjectData(data);
  let created = false;

  try {
    await validateProject(clean, null);

    // 1) La fila del proyecto. updated_at y completed_at empiezan vacías.
    check(
      await supabase.from('projects').insert({
        id: clean.id,
        ...toProjectRow(clean),
        status: PROJECT_STATUS.ACTIVE,
        cancel_reason: '',
        created_at: new Date().toISOString(),
        updated_at: null,
        completed_at: null,
      }),
      'No se pudo crear el proyecto.'
    );
    created = true;

    // 2) Las filas de multimedia (en orden)
    if (clean.media.length > 0) {
      check(await supabase.from('project_media').insert(toMediaRows(clean.id, clean.media)), 'No se pudieron guardar las imágenes y videos.');
    }
  } catch (error) {
    // Algo falló: se deshace todo para no dejar un proyecto a medias
    if (created) await supabase.from('projects').delete().eq('id', clean.id);
    await removeFiles(BUCKETS.PROJECT_MEDIA, ownPaths(clean.id, clean.media));
    throw error;
  }

  return findProjectOrFail(clean.id);
}

/** Reemplaza la multimedia: primero inserta la lista nueva y después borra las filas viejas */
async function replaceMediaRows(current, media) {
  const fallback = 'No se pudieron actualizar las imágenes y videos.';
  if (media.length > 0) {
    check(await supabase.from('project_media').insert(toMediaRows(current.id, media)), fallback);
  }
  const oldIds = current.media.map((item) => item.id);
  if (oldIds.length > 0) {
    check(await supabase.from('project_media').delete().in('id', oldIds), fallback);
  }
}

/** Edita un proyecto. El ID nunca cambia (es la llave del proyecto). */
export async function updateProject(projectId, data) {
  const current = await findProjectOrFail(projectId);
  const clean = cleanProjectData({ ...data, id: current.id });

  // Archivos que el navegador acaba de subir (no estaban en el proyecto)
  const currentPaths = current.media.map((item) => item.path);
  const newPaths = ownPaths(current.id, clean.media).filter((path) => !currentPaths.includes(path));

  try {
    await validateProject(clean, current.id);
    check(
      await supabase.from('projects').update({ ...toProjectRow(clean), ...getUpdateTimestamps(current, current.status) }).eq('id', current.id),
      'No se pudo guardar el proyecto.'
    );
    await replaceMediaRows(current, clean.media);
  } catch (error) {
    await removeFiles(BUCKETS.PROJECT_MEDIA, newPaths);
    throw error;
  }

  // Los archivos que se quitaron del proyecto se borran de Storage
  const keptPaths = clean.media.map((item) => item.path);
  await removeFiles(BUCKETS.PROJECT_MEDIA, currentPaths.filter((path) => !keptPaths.includes(path)));

  return findProjectOrFail(current.id);
}

/** Borra un proyecto y sus archivos (las filas de project_media se borran solas: ON DELETE CASCADE) */
export async function deleteProject(projectId) {
  const current = await findProjectOrFail(projectId);
  check(await supabase.from('projects').delete().eq('id', current.id), 'No se pudo borrar el proyecto.');
  await removeFiles(BUCKETS.PROJECT_MEDIA, current.media.map((item) => item.path));
}

/**
 * Cambia el estado a ACTIVO o INACTIVO. Al activar se borra la observación
 * de cancelación. También sirve para REABRIR un proyecto terminado.
 */
export async function setProjectStatus(projectId, status) {
  if (![PROJECT_STATUS.ACTIVE, PROJECT_STATUS.INACTIVE].includes(status)) {
    throw new HttpError(400, 'Estado no permitido.');
  }
  const current = await findProjectOrFail(projectId);
  const patch = { status };
  if (status === PROJECT_STATUS.ACTIVE) patch.cancel_reason = '';
  return patchProject(current, patch, 'No se pudo cambiar el estado del proyecto.');
}

/** Marca un proyecto como TERMINADO: pasa a la fase final y guarda la fecha de finalización */
export async function completeProject(projectId) {
  const current = await findProjectOrFail(projectId);
  if (current.status === PROJECT_STATUS.CANCELLED) {
    throw new HttpError(400, 'Un proyecto cancelado no se puede completar. Actívalo primero.');
  }
  return patchProject(current, { status: PROJECT_STATUS.COMPLETED, phase: 'despliegue' }, 'No se pudo completar el proyecto.');
}

/** Cancela un proyecto. La observación es OBLIGATORIA (error en el campo "reason") */
export async function cancelProject(projectId, reason) {
  const cleanReason = cleanText(reason);
  if (cleanReason.length < MIN_CANCEL_REASON) {
    throwIfInvalid({ reason: `Escribe la observación de cancelación (mínimo ${MIN_CANCEL_REASON} caracteres).` });
  }
  if (cleanReason.length > MAX_LENGTH.CANCEL_REASON) {
    throwIfInvalid({ reason: `La observación puede tener máximo ${MAX_LENGTH.CANCEL_REASON} caracteres.` });
  }
  const current = await findProjectOrFail(projectId);
  return patchProject(current, { status: PROJECT_STATUS.CANCELLED, cancel_reason: cleanReason }, 'No se pudo cancelar el proyecto.');
}
