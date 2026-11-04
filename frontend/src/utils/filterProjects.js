/* ==========================================================================
   FILTRO Y ORDEN DE PROYECTOS (Panel Administrador)
   --------------------------------------------------------------------------
   Función pura: recibe la lista completa y los filtros elegidos, y devuelve
   una NUEVA lista filtrada y ordenada (nunca modifica la original).
   ========================================================================== */

import { normalizeText } from './validators.js';

/* Valores por defecto de los filtros (también sirven para "Limpiar") */
export const DEFAULT_FILTERS = {
  idQuery: '', // búsqueda por ID
  nameQuery: '', // búsqueda por nombre
  status: 'todos', // todos | activo | inactivo | cancelado | terminado
  category: 'todas', // todas | una categoría
  recentDays: 'todos', // todos | 7 | 30 | 90  (agregados recientemente)
  sort: 'fecha-desc', // fecha-desc | fecha-asc | precio-desc | precio-asc
};

/* Opciones del select de orden */
export const SORT_OPTIONS = [
  { value: 'fecha-desc', label: 'Fecha: más reciente a más antiguo' },
  { value: 'fecha-asc', label: 'Fecha: más antiguo a más reciente' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
];

/* Opciones del select "Agregados recientemente" */
export const RECENT_OPTIONS = [
  { value: 'todos', label: 'Cualquier fecha' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

/* Milisegundos que tiene un día */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Aplica todos los filtros y el orden.
 * @param {Array} projects - Lista completa de proyectos.
 * @param {object} filters - Objeto con la forma de DEFAULT_FILTERS.
 */
export function filterProjects(projects, filters) {
  const idQuery = normalizeText(filters.idQuery);
  const nameQuery = normalizeText(filters.nameQuery);

  // 1. Filtrar
  const filtered = projects.filter((project) => {
    // Por ID (contiene el texto escrito)
    if (idQuery && !normalizeText(project.id).includes(idQuery)) return false;

    // Por nombre (contiene el texto escrito)
    if (nameQuery && !normalizeText(project.name).includes(nameQuery)) return false;

    // Por estado
    if (filters.status !== 'todos' && project.status !== filters.status) return false;

    // Por categoría
    if (filters.category !== 'todas' && project.category !== filters.category) return false;

    // Agregados recientemente: creados dentro de los últimos N días
    if (filters.recentDays !== 'todos') {
      const limitDate = Date.now() - Number(filters.recentDays) * ONE_DAY_MS;
      if (new Date(project.createdAt).getTime() < limitDate) return false;
    }

    return true;
  });

  // 2. Ordenar (copiamos con [...] porque sort modifica el arreglo)
  return [...filtered].sort((projectA, projectB) => {
    const dateA = new Date(projectA.createdAt).getTime();
    const dateB = new Date(projectB.createdAt).getTime();

    switch (filters.sort) {
      case 'fecha-asc':
        return dateA - dateB;
      case 'precio-desc':
        return projectB.price - projectA.price;
      case 'precio-asc':
        return projectA.price - projectB.price;
      case 'fecha-desc':
      default:
        return dateB - dateA;
    }
  });
}

/** Cuenta cuántos proyectos hay de cada estado (para los chips y tarjetas) */
export function countByStatus(projects) {
  return projects.reduce(
    (counts, project) => {
      counts.todos += 1;
      counts[project.status] = (counts[project.status] || 0) + 1;
      return counts;
    },
    { todos: 0, activo: 0, inactivo: 0, cancelado: 0, terminado: 0 }
  );
}
