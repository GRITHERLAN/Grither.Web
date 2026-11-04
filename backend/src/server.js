/* ==========================================================================
   ARRANQUE DEL SERVIDOR (solo en local)
   --------------------------------------------------------------------------
   npm run dev  ->  node --watch --env-file=.env src/server.js
   "--watch" reinicia el servidor solo cada vez que se guarda un archivo.
   En Vercel este archivo no se usa: Vercel toma "app" de app.js.
   ========================================================================== */

import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`API de Grither lista en http://localhost:${env.port}/api`);
});
