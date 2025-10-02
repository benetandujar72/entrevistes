import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const logsDir = process.env.LOGS_DIR || 'logs';

// Formato personalizado para desarrollo
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Formato JSON estructurado para producción
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transports
const transports: winston.transport[] = [];

// Console transport (siempre activo)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  })
);

// File transports (solo en producción o si se especifica LOGS_DIR)
if (process.env.NODE_ENV === 'production' || process.env.LOGS_DIR) {
  // Error logs - rotación diaria
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
      format: prodFormat,
    })
  );

  // Combined logs - rotación diaria
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: prodFormat,
    })
  );
}

// Crear logger
export const logger = winston.createLogger({
  level: logLevel,
  transports,
  // No salir en errores no manejados
  exitOnError: false,
});

// Helper functions para logging estructurado
export const loggers = {
  // Log de request HTTP
  request: (req: any, statusCode: number, duration: number) => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    });
  },

  // Log de error
  error: (error: Error, context?: Record<string, any>) => {
    logger.error(error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    });
  },

  // Log de operación de base de datos
  database: (operation: string, table: string, duration?: number, error?: Error) => {
    if (error) {
      logger.error('Database Error', {
        operation,
        table,
        duration: duration ? `${duration}ms` : undefined,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
    } else {
      logger.debug('Database Operation', {
        operation,
        table,
        duration: duration ? `${duration}ms` : undefined,
      });
    }
  },

  // Log de integración externa (Google Calendar, Email, etc.)
  external: (service: string, operation: string, success: boolean, details?: Record<string, any>) => {
    const level = success ? 'info' : 'warn';
    logger.log(level, `External Service: ${service}`, {
      service,
      operation,
      success,
      ...details,
    });
  },

  // Log de sincronización
  sync: (type: string, status: 'success' | 'error', details?: Record<string, any>) => {
    const level = status === 'success' ? 'info' : 'error';
    logger.log(level, `Sync ${type}`, {
      type,
      status,
      ...details,
    });
  },

  // Log de autenticación
  auth: (action: string, email: string, success: boolean, reason?: string) => {
    logger.info('Authentication', {
      action,
      email,
      success,
      reason,
    });
  },
};

export default logger;
