/* ==========================================================================
   APLICACIÓN EXPRESS
   --------------------------------------------------------------------------
   Arma el servidor en este orden (el orden IMPORTA: Express pasa cada
   petición por los middlewares de arriba hacia abajo):
     1) cors         -> solo deja entrar peticiones del frontend permitido
     2) express.json -> convierte el body JSON en un objeto (req.body)
     3) rutas /api   -> el trabajo real
     4) notFound     -> si ninguna ruta respondió
     5) errorHandler -> todos los errores terminan aquí

   Se exporta "app" sin encender el servidor: así Vercel la puede usar
   directamente, y en local la enciende server.js.
   ========================================================================== */

import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

/* CORS: el navegador bloquea las peticiones a otro dominio, salvo que el
   servidor diga "este origen está permitido". Solo se permite el frontend. */
app.use(cors({ origin: env.frontendUrls }));

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
