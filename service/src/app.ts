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
import admin from './routes/admin.js';
import consolidacion from './routes/consolidacion.js';
import dadesPersonals from './routes/dades-personals.js';
import emails from './routes/emails.js';

export function createApp() {
  const app = express();
  
  // Middleware de logging
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
  });
  
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
  app.use('/admin', admin);
  app.use('/consolidacion', consolidacion);
  app.use('/dades-personals', dadesPersonals);
  app.use('/emails', emails);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  
  // Endpoint para verificar estado de autenticación
  app.get('/api/auth/status', (_req, res) => {
    res.json({ 
      disabled: process.env.DISABLE_AUTH === '1',
      message: process.env.DISABLE_AUTH === '1' ? 'Autenticación deshabilitada' : 'Autenticación habilitada'
    });
  });

  // Middleware de manejo de errores mejorado
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const timestamp = new Date().toISOString();
    const status = err?.status || 500;
    const msg = status === 400 ? 'Dades requerides incompletes' : 'Error intern';
    
    console.error(`[${timestamp}] ERROR ${req.method} ${req.path}:`, {
      message: err.message,
      stack: err.stack,
      status: status,
      body: req.body
    });
    
    try { 
      res.status(status).json({ error: msg, timestamp }); 
    } catch (e) {
      console.error('Error enviando respuesta de error:', e);
    }
  });
  return app;
}


