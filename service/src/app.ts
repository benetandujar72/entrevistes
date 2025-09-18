import express from 'express';
import cors from 'cors';
import alumnes from './routes/alumnes.js';
import entrevistes from './routes/entrevistes.js';
import cursos from './routes/cursos.js';
import usuaris from './routes/usuaris.js';
import tutors from './routes/tutors.js';
import importer from './routes/import.js';
import sheetsDiag from './routes/sheets.js';
import alumnesDb from './routes/alumnes_db.js';

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin: (origin, cb) => cb(null, true),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-ID-Token']
    })
  );
  app.options('*', cors());
  app.use(express.json());
  app.use('/alumnes', alumnes);
  app.use('/alumnes-db', alumnesDb);
  app.use('/entrevistes', entrevistes);
  app.use('/cursos', cursos);
  app.use('/usuaris', usuaris);
  app.use('/tutors', tutors);
  app.use('/import', importer);
  app.use('/sheets', sheetsDiag);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // errores simples
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err?.status || 500;
    const msg = status === 400 ? 'Dades requerides incompletes' : 'Error intern';
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err);
    try { res.status(status).json({ error: msg }); } catch {}
  });
  return app;
}


