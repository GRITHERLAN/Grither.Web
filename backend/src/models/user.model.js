/* ==========================================================================
   MODELO: USUARIO (tabla profiles)
   --------------------------------------------------------------------------
   Un "model" aquí es solo la traducción entre la fila de la base de datos
   (snake_case: created_at) y el objeto que recibe el frontend
   (camelCase: createdAt). Así el frontend nunca depende de los nombres de
   las columnas.
   La contraseña NO está en profiles: vive cifrada en Supabase Auth.
   ========================================================================== */

/* Roles posibles (los mismos valores que exige el CHECK de la tabla) */
export const ROLES = {
  ADMIN: 'admin',
  USER: 'usuario',
};

/* Columnas que se piden siempre de profiles */
export const PROFILE_COLUMNS = 'id, name, email, role, active, created_at';

/** Fila de profiles -> objeto usuario que usa la app */
export function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
  };
}
