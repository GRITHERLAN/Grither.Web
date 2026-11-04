/* ==========================================================================
   VARIABLES DE ENTORNO
   --------------------------------------------------------------------------
   Se leen UNA sola vez al arrancar. Si falta alguna obligatoria, el servidor
   no arranca y avisa cuál falta: es mejor fallar al inicio que a mitad de
   una petición de un usuario.
   En local salen del archivo .env (node --env-file=.env); en Vercel, de
   Project Settings > Environment Variables.
   ========================================================================== */

/** Devuelve la variable o lanza un error claro si no existe */
function readRequired(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa backend/.env (ver .env.example).`);
  }
  return value;
}

export const env = {
  supabaseUrl: readRequired('SUPABASE_URL'),
  supabaseServiceRoleKey: readRequired('SUPABASE_SERVICE_ROLE_KEY'),

  /* Lista de orígenes permitidos por CORS: "a,b" -> ['a', 'b'] */
  frontendUrls: readRequired('FRONTEND_URLS')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),

  port: Number(process.env.PORT) || 3000,
};
