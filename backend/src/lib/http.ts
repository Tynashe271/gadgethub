import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, details, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, undefined, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(401, message, undefined, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(403, message, undefined, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, undefined, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(429, message, undefined, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(503, message, undefined, 'SERVICE_UNAVAILABLE');
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res, next).catch(next);
  };

export const validate = <T>(schema: ZodType<T>, data: unknown): T => schema.parse(data);

export function notFound(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  next(
    new AppError(404, `Route ${req.method} ${req.path} not found`, undefined, 'NOT_FOUND')
  );
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error for debugging
  console.error('Error:', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      code: 'VALIDATION_ERROR',
    });
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Resource already exists',
        code: 'CONFLICT',
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Resource not found',
        code: 'NOT_FOUND',
      });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Foreign key constraint failed',
        code: 'FOREIGN_KEY_ERROR',
      });
    }
  }

  // Handle custom AppErrors
  if (error instanceof AppError) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }

  // Handle JWT errors
  if (error instanceof Error && error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }

  if (error instanceof Error && error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
  }

  // Handle database initialization errors
  if (
    error instanceof Error
    && ['PrismaClientInitializationError', 'PrismaClientKnownRequestError'].includes(error.name)
  ) {
    console.error('[Database]', error.message);
    return res.status(503).json({
      error: 'Database is temporarily unavailable',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  // Handle AI provider errors
  const providerError = error as { status?: number; code?: string };
  if (req.originalUrl.includes('/api/v1/assistant')) {
    if (providerError.code === 'credit_balance_exhausted' || providerError.status === 402) {
      return res.status(402).json({
        error: 'AI provider credits are exhausted. Add credits in your provider billing, then try again.',
        code: 'AI_CREDIT_EXHAUSTED',
      });
    }
    if (providerError.status === 401) {
      return res.status(503).json({
        error: 'The AI provider key is invalid or does not have access.',
        code: 'AI_KEY_INVALID',
      });
    }
    if (providerError.status === 429) {
      return res.status(429).json({
        error: 'The AI assistant is temporarily rate limited. Please try again shortly.',
        code: 'AI_RATE_LIMITED',
      });
    }
    if (providerError.status && providerError.status >= 400) {
      return res.status(502).json({
        error: 'The AI provider could not complete this request. Please try again.',
        code: 'AI_PROVIDER_ERROR',
      });
    }
  }

  // Default error response
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : (error instanceof Error ? error.message : String(error));

  return res.status(500).json({
    error: message,
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: error instanceof Error ? error.stack : undefined 
    }),
  });
}
