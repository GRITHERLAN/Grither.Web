/* ==========================================================================
   MODELO: PORTAFOLIO (tabla portfolio)
   --------------------------------------------------------------------------
   Traduce entre la fila de la BD y el objeto que usa el frontend.
   La columna is_real (true/false) se muestra en la app como "type":
   'real' (proyecto de un cliente) o 'prueba' (demostración).
   ========================================================================== */

export const PORTFOLIO_TYPES = {
  REAL: 'real',
  DEMO: 'prueba',
};

export const PORTFOLIO_COLUMNS = 'id, title, description, category, stack, url, is_real, image_url, created_at';

/** Fila de la tabla -> objeto de la app */
export function toPortfolioItem(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    stack: row.stack || [],
    url: row.url,
    type: row.is_real ? PORTFOLIO_TYPES.REAL : PORTFOLIO_TYPES.DEMO,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

/** Datos ya limpios -> columnas de la tabla */
export function toPortfolioRow(clean, imageUrl) {
  return {
    title: clean.title,
    description: clean.description,
    category: clean.category,
    stack: clean.stack,
    url: clean.url,
    is_real: clean.type === PORTFOLIO_TYPES.REAL,
    image_url: imageUrl,
  };
}
