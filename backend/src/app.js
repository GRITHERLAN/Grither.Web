/* ==========================================================================
   APLICACIÓN EXPRESS
   --------------------------------------------------------------------------
   Arma el servidor en este orden (el orden IMPORTA: Express pasa cada
   petición por los middlewares de arriba hacia abajo):
     1) express.json -> convierte el body JSON en un objeto (req.body)
     2) rutas /api   -> el trabajo real
     3) notFound     -> si ninguna ruta respondió
     4) errorHandler -> todos los errores terminan aquí

   No hay CORS: la API y el frontend viven en el MISMO dominio (un solo
   Worker de Cloudflare), así que el navegador no las ve como sitios
   distintos. Cualquier otra web que intente llamar a la API desde el
   navegador queda bloqueada por la política de mismo origen.

   Se exporta "app" sin encender el servidor: en Cloudflare la conecta
   worker.js y en local la enciende server.js.
   ========================================================================== */

import express from 'express';
import routes from './routes/index.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

/* El body llega como texto JSON; esto lo convierte en objeto.
   El límite evita que alguien mande un body enorme (los archivos no pasan
   por aquí: se suben directo a Storage). */
app.use(express.json({ limit: '1mb' }));

/* Si la petición no trae body (ej. POST /complete), req.body queda vacío ({})
   en vez de undefined; así los services no fallan al leer un campo. */
app.use((req, res, next) => {
  req.body = req.body ?? {};
  next();
});

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
