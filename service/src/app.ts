import express from 'express';
import cors from 'cors';
import alumnes from './routes/alumnes.js';
import entrevistes from './routes/entrevistes.js';
import cursos from './routes/cursos.js';

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://localhost:5174'],
      credentials: true
    })
  );
  app.use(express.json());
  app.use('/alumnes', alumnes);
  app.use('/entrevistes', entrevistes);
  app.use('/cursos', cursos);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // errores simples
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err?.status || 500;
    const msg = status === 400 ? 'Dades requerides incompletes' : 'Error intern';
    res.status(status).json({ error: msg });
  });
  return app;
}


