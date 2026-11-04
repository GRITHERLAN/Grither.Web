/* ==========================================================================
   CLIENTE DE LA BASE DE DATOS (Supabase con llave secreta)
   --------------------------------------------------------------------------
   Este es el ÚNICO lugar del proyecto donde existe la llave service_role.
   Con ella el backend puede leer y escribir todo (se salta la RLS), por eso:
     - nunca se envía al navegador,
     - solo la usan los services (nunca los controllers ni las rutas),
     - cada service revisa los permisos ANTES de usarla (los middlewares
       requireAuth y requireAdmin ya dijeron quién llama).
   ========================================================================== */

import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    /* El servidor no "inicia sesión": cada petición trae el token del usuario,
       así que no hay que guardar ni renovar ninguna sesión aquí. */
    persistSession: false,
    autoRefreshToken: false,
  },
});
