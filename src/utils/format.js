/* ==========================================================================
   FUNCIONES DE FORMATO
   ========================================================================== */

/* Formateador de pesos colombianos: 9800000 -> "$ 9.800.000" */
const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Muestra un número como precio en COP (Peso Colombiano) */
export function formatCOP(value) {
  return copFormatter.format(Number(value) || 0);
}

/** Muestra una fecha ISO como dd/mm/aaaa */
export function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Devuelve las iniciales de un nombre: "Nicolas Valencia" -> "NV" */
export function getInitials(name) {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** Quita el "https://www." de un enlace para mostrarlo más limpio */
export function prettyUrl(url) {
  return String(url)
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}
