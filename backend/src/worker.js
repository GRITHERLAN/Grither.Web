/* ==========================================================================
   ARRANQUE EN CLOUDFLARE WORKERS
   --------------------------------------------------------------------------
   Cloudflare no enciende un servidor Node normal: ejecuta un "Worker" que
   recibe peticiones. httpServerHandler (de cloudflare:node) hace de puente:
   cada petición que llega al Worker se le pasa a la app de Express como si
   hubiera llegado al puerto indicado. El puerto es solo un nombre interno.

   El Worker solo recibe /api/* (ver run_worker_first en wrangler.jsonc);
   las páginas y archivos del frontend los sirve Cloudflare directamente.
   En local se sigue usando server.js (npm run dev).
   ========================================================================== */

import { httpServerHandler } from 'cloudflare:node';
import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port);

export default httpServerHandler({ port: env.port });
