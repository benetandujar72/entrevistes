import express, { Request, Response } from 'express';
import { query } from '../db.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// Información de la aplicación
const appInfo = {
  name: 'Entrevistes App API',
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
};

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check básico
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servicio funcionando
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check - verifica que todas las dependencias estén listas
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servicio listo para recibir tráfico
 *       503:
 *         description: Servicio no listo (dependencias fallando)
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; duration?: number }> = {};
  let allHealthy = true;

  // Check 1: Base de datos
  try {
    const start = Date.now();
    await query('SELECT 1');
    checks.database = {
      status: 'ok',
      duration: Date.now() - start,
    };
  } catch (error) {
    allHealthy = false;
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check 2: Google Calendar (opcional)
  checks.googleCalendar = {
    status: process.env.GOOGLE_CLIENT_EMAIL ? 'ok' : 'ok',
    message: process.env.GOOGLE_CLIENT_EMAIL ? 'Configured' : 'Not configured (optional)',
  };

  // Check 3: Email service (opcional)
  checks.emailService = {
    status: process.env.EMAIL_USER ? 'ok' : 'ok',
    message: process.env.EMAIL_USER ? 'Configured' : 'Not configured (optional)',
  };

  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    ...appInfo,
    checks,
  });
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness check - verifica que el proceso esté vivo
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Proceso vivo
 */
router.get('/health/live', (_req: Request, res: Response) => {
  // Verificar que el proceso esté respondiendo
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime)}s`,
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    },
  });
});

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Métricas básicas del sistema
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Métricas del sistema
 */
router.get('/health/metrics', async (_req: Request, res: Response) => {
  try {
    // Métricas de base de datos
    const result = await query(`
      SELECT
        (SELECT COUNT(*) FROM alumnes) as total_alumnos,
        (SELECT COUNT(*) FROM cites_calendari) as total_citas,
        (SELECT COUNT(*) FROM cites_calendari WHERE estat = 'pendent') as citas_pendientes,
        (SELECT COUNT(*) FROM cites_calendari WHERE estat = 'confirmada') as citas_confirmadas,
        (SELECT COUNT(*) FROM entrevistes) as total_entrevistas,
        (SELECT COUNT(*) FROM usuaris) as total_usuarios
    `);
    const dbStats = result.rows[0];

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...appInfo,
      process: {
        uptime: `${Math.floor(process.uptime())}s`,
        nodeVersion: process.version,
        platform: process.platform,
      },
      database: dbStats,
    });
  } catch (error) {
    logger.error('Error fetching metrics', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch metrics',
    });
  }
});

export default router;
