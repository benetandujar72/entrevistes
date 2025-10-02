import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

// Configuración de Helmet para headers de seguridad
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Para Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'"], // Para Swagger UI
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Permite embeds externos si es necesario
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Middleware para sanitización de inputs
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitizar query params
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        // Remover caracteres peligrosos para SQL injection básico
        req.query[key] = (req.query[key] as string)
          .replace(/[<>]/g, '') // XSS básico
          .trim();
      }
    }
  }

  // Sanitizar body (básico - Zod hace validación más estricta)
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

// Función recursiva para sanitizar objetos
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remover caracteres peligrosos
      obj[key] = obj[key]
        .replace(/[<>]/g, '') // XSS básico
        .trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// Middleware para validar origen de requests
export const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  const referer = req.get('referer');
  const allowedDomain = process.env.ALLOWED_DOMAIN || 'insbitacola.cat';

  // Si es desarrollo, permitir localhost
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Verificar si el origen es permitido
  if (origin && !origin.includes(allowedDomain) && !origin.includes('localhost')) {
    logger.warn('Suspicious origin detected', {
      origin,
      referer,
      ip: req.ip,
      path: req.path,
    });
    // En producción, podrías rechazar la request
    // return res.status(403).json({ error: 'Origin not allowed' });
  }

  next();
};

// Middleware para prevenir parameter pollution
export const preventParameterPollution = (req: Request, res: Response, next: NextFunction) => {
  // Asegurar que los parámetros no sean arrays cuando no deberían serlo
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      // Tomar solo el primer valor
      req.query[key] = (req.query[key] as string[])[0];
      logger.warn('Parameter pollution detected', {
        param: key,
        ip: req.ip,
        path: req.path,
      });
    }
  }
  next();
};

// Middleware para agregar headers de seguridad adicionales
export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevenir MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection (legacy pero no hace daño)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};
