import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { logger, loggers } from './config/logger.js';
import {
  securityHeaders,
  sanitizeInput,
  preventParameterPollution,
  additionalSecurityHeaders
} from './middleware/security.js';
import {
  generalLimiter,
  authLimiter,
  createCitaLimiter,
  importLimiter,
  webhookLimiter
} from './middleware/rate-limiter.js';
import {
  errorHandler,
  handleZodError,
  notFoundHandler
} from './middleware/error-handler.js';
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
import importComplet from './routes/import-complet.js';
import calendarioPublico from './routes/calendario-publico.js';
import authTest from './routes/auth-test.js';
import tutoresAlumnos from './routes/tutores-alumnos.js';
import citas from './routes/citas.js';
import googleCalendarWebhook from './routes/google-calendar-webhook.js';
import health from './routes/health.js';

export function createApp() {
  const app = express();

  // 1. Security headers (debe ir primero)
  app.use(securityHeaders);
  app.use(additionalSecurityHeaders);

  // 2. CORS
  app.use(
    cors({
      origin: (origin, cb) => cb(null, true),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-ID-Token']
    })
  );
  app.options('*', cors());

  // 3. Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Request logging con Winston
  app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      loggers.request(req, res.statusCode, duration);
    });

    next();
  });

  // 5. Security middleware
  app.use(sanitizeInput);
  app.use(preventParameterPollution);

  // 6. Rate limiting general (excepto health checks y swagger)
  app.use(/^(?!\/health|\/api-docs).*$/, generalLimiter);
  // 7. Health checks (sin rate limiting)
  app.use('/', health);

  // 8. API Routes con rate limiting específico
  app.use('/alumnes', alumnes);
  app.use('/alumnes-db', alumnesDb);
  app.use('/entrevistes', entrevistes);
  app.use('/cursos', cursos);
  app.use('/usuaris', usuaris);
  app.use('/tutors', tutors);
  app.use('/import', importLimiter, importer);
  app.use('/import-complet', importLimiter, importComplet);
  app.use('/sheets', sheetsDiag);
  app.use('/admin', admin);
  app.use('/consolidacion', consolidacion);
  app.use('/dades-personals', dadesPersonals);
  app.use('/emails', emails);
  app.use('/calendario-publico', calendarioPublico);
  app.use('/auth-test', authLimiter, authTest);
  app.use('/tutores-alumnos', tutoresAlumnos);
  app.use('/citas', citas);
  app.use('/google-calendar-webhook', webhookLimiter, googleCalendarWebhook);

  // 9. Swagger API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Entrevistes App API Documentation'
  }));
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // 10. Endpoint para verificar estado de autenticación
  app.get('/api/auth/status', (_req, res) => {
    res.json({
      authDisabled: false,
      message: 'Autenticación habilitada - Solo Google OAuth'
    });
  });

  // 11. Manejo de errores
  // Primero: manejar errores de validación Zod
  app.use(handleZodError);

  // Después: 404 para rutas no encontradas
  app.use(notFoundHandler);

  // Finalmente: manejador general de errores
  app.use(errorHandler);

  return app;
}


