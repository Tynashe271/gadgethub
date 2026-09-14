import pino from 'pino';
import pinoHttp from 'pino-http';
import { config } from '../config.js';

const logLevel = process.env.LOG_LEVEL || 'info';

const logger = pino({
  level: logLevel,
  transport: config.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: process.pid,
    hostname: require('os').hostname(),
    env: config.NODE_ENV,
  },
});

export default logger;

// Create child logger with context
export function createLogger(context: string) {
  return logger.child({ context });
}

// HTTP logging middleware
export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (res, err) => {
    const statusCode = res.statusCode || 200;
    if (statusCode >= 400 && statusCode < 500) {
      return 'warn';
    }
    if (statusCode >= 500 || err) {
      return 'error';
    }
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    const statusCode = res.statusCode || 200;
    return `${req.method} ${req.url} completed with ${statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    const statusCode = res.statusCode || 500;
    return `${req.method} ${req.url} failed with ${statusCode} - ${err?.message}`;
  },
});

// Request context middleware
export function requestContext(req: any, _res: any, next: any) {
  req.id = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.logger = logger.child({ requestId: req.id });
  next();
}

// Request logging middleware with performance tracking
export function requestLogger(req: any, res: any, next: any) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode || 200;
    
    const logData = {
      method: req.method,
      url: req.url,
      statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (statusCode >= 400) {
      logger.warn(logData, 'HTTP request completed with error');
    } else if (statusCode >= 500) {
      logger.error(logData, 'HTTP request completed with server error');
    } else {
      logger.info(logData, 'HTTP request completed');
    }
  });

  next();
}

// Error logging utility
export function logError(error: Error, context?: Record<string, any>) {
  logger.error({
    err: error,
    ...context,
  }, error.message);
}

// Performance logging utility
export function logPerformance(operation: string, duration: number, context?: Record<string, any>) {
  const data = {
    operation,
    duration,
    ...context,
  };

  if (duration > 1000) {
    logger.warn(data, 'Slow operation detected');
  } else {
    logger.debug(data, 'Operation completed');
  }
}

// Security event logging
export function logSecurityEvent(event: string, details: Record<string, any>) {
  logger.warn({
    event,
    ...details,
  }, 'Security event');
}

// Business event logging
export function logBusinessEvent(event: string, details: Record<string, any>) {
  logger.info({
    event,
    ...details,
  }, 'Business event');
}