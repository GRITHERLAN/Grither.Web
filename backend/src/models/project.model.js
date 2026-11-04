/* ==========================================================================
   MODELO: PROYECTO (tablas projects y project_media)
   --------------------------------------------------------------------------
   Traduce entre las filas de la BD y el objeto de proyecto del frontend.
   ========================================================================== */

/* Estados posibles (los mismos valores del CHECK de la tabla) */
export const PROJECT_STATUS = {
  ACTIVE: 'activo',
  INACTIVE: 'inactivo',
  CANCELLED: 'cancelado',
  COMPLETED: 'terminado',
};

/* Fases del proceso, en orden */
export const PROJECT_PHASES = ['reunion', 'bocetos', 'desarrollo', 'despliegue'];

/* Categorías (si se agrega una, también hay que agregarla en el CHECK de la tabla) */
export const PROJECT_CATEGORIES = [
  'Landing page',
  'Sitio corporativo',
  'Web app / SaaS',
  'Web a la medida',
  'Soporte y mantenimiento',
];

/* Columnas que se piden de cada proyecto, incluida su multimedia
   (Supabase une las dos tablas gracias a la llave foránea project_id) */
export const PROJECT_COLUMNS = '*, project_media(id, type, path, name, position)';

/**
 * Fila de projects (con su project_media) -> objeto de proyecto.
 * @param {Map<string, string>} signedUrls - ruta -> URL firmada para mostrar el archivo.
 */
export function toProject(row, signedUrls) {
  // La multimedia llega sin orden: se ordena por "position".
  // "src" es la URL firmada para verla; "path" es la ruta guardada en la tabla.
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

/** Datos limpios del formulario -> columnas editables de projects */
export function toProjectRow(clean) {
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

/** Lista de multimedia -> filas de project_media (la posición guarda el orden) */
export function toMediaRows(projectId, media) {
  return media.map((item, index) => ({
    project_id: projectId,
    type: item.type,
    path: item.path,
    name: item.name,
    position: index,
  }));
}
