import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger, loggers } from '../config/logger.js';

// Clase base para errores de aplicación
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Errores específicos
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} no encontrado`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(403, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

// Middleware para capturar errores de Zod
export const handleZodError = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn('Validation error', {
      path: req.path,
      method: req.method,
      errors,
    });

    return res.status(400).json({
      error: 'Error de validación',
      details: errors,
    });
  }

  next(err);
};

// Middleware principal de manejo de errores
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Si es un error operacional (esperado)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Error de base de datos
  if ((err as any).code) {
    const dbError = err as any;

    // Violación de clave única
    if (dbError.code === '23505') {
      logger.warn('Unique constraint violation', {
        detail: dbError.detail,
        path: req.path,
      });
      return res.status(409).json({
        error: 'El recurso ya existe',
        detail: dbError.detail,
      });
    }

    // Violación de clave foránea
    if (dbError.code === '23503') {
      logger.warn('Foreign key violation', {
        detail: dbError.detail,
        path: req.path,
      });
      return res.status(400).json({
        error: 'Referencia inválida',
        detail: dbError.detail,
      });
    }

    // Violación de NOT NULL
    if (dbError.code === '23502') {
      logger.warn('Not null violation', {
        column: dbError.column,
        path: req.path,
      });
      return res.status(400).json({
        error: 'Campo requerido faltante',
        field: dbError.column,
      });
    }
  }

  // Error no manejado - loggear con stack trace completo
  loggers.error(err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // En desarrollo, retornar stack trace
  if (process.env.NODE_ENV === 'development') {
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: err.message,
      stack: err.stack,
    });
  }

  // En producción, mensaje genérico
  return res.status(500).json({
    error: 'Error interno del servidor',
  });
};

// Middleware para capturar 404
export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
  });
};

// Wrapper para async handlers (evita try-catch en cada ruta)
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
