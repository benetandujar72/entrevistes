import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { logger } from '../config/logger.js';

// En desarrollo, usar límite muy alto o desactivar
const isDevelopment = process.env.NODE_ENV !== 'production';
// Rate limiter general para la API
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 10000 : 500, // 100 requests por ventana
  message: {
    error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.',
    retryAfter: '15 minutos',
  },
  standardHeaders: true, // Retorna info en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
  validate: {
    trustProxy: false,
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.',
      retryAfter: '15 minutos',
    });
  },
});

// Rate limiter estricto para endpoints de autenticación
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por ventana
  skipSuccessfulRequests: true, // Solo cuenta requests fallidos
  message: {
    error: 'Demasiados intentos de autenticación, por favor intenta de nuevo más tarde.',
    retryAfter: '15 minutos',
  },
  validate: {
    trustProxy: false,
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Demasiados intentos de autenticación. Por favor intenta de nuevo en 15 minutos.',
    });
  },
});

// Rate limiter para creación de citas (prevenir spam)
export const createCitaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 citas por hora
  keyGenerator: (req: Request) => {
    // Limitar por email de familia si existe, sino por default
    const body = req.body as any;
    return body?.email_familia || 'default';
  },
  validate: {
    trustProxy: false,
  },
  message: {
    error: 'Has alcanzado el límite de citas que puedes crear. Intenta de nuevo en 1 hora.',
  },
  handler: (req, res) => {
    logger.warn('Create cita rate limit exceeded', {
      ip: req.ip,
      email: (req.body as any)?.email_familia,
    });
    res.status(429).json({
      error: 'Has alcanzado el límite de citas que puedes crear. Intenta de nuevo en 1 hora.',
    });
  },
});

// Rate limiter para importación de datos (muy restrictivo)
export const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Solo 3 importaciones por hora
  message: {
    error: 'Has alcanzado el límite de importaciones. Intenta de nuevo en 1 hora.',
  },
  validate: {
    trustProxy: false,
  },
  handler: (req, res) => {
    logger.warn('Import rate limit exceeded', {
      ip: req.ip,
      userId: (req as any).user?.id,
    });
    res.status(429).json({
      error: 'Has alcanzado el límite de importaciones. Intenta de nuevo en 1 hora.',
    });
  },
});

// Rate limiter para webhooks (prevenir abuse)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 requests por minuto
  message: {
    error: 'Demasiadas notificaciones de webhook.',
  },
  validate: {
    trustProxy: false,
  },
  handler: (req, res) => {
    logger.warn('Webhook rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Demasiadas notificaciones de webhook.',
    });
  },
});
