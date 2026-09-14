import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from '../config.js';

// Security headers configuration
export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// Rate limiting configurations
export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options?.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options?.max || 100, // 100 requests per window default
    message: options?.message || 'Too many requests from this IP, please try again later.',
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: options?.skipSuccessfulRequests || false,
    skipFailedRequests: false,
    skip: () => config.NODE_ENV === 'test',
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((options?.windowMs || 15 * 60 * 1000) / 1000),
      });
    },
  });
};

// Specific rate limiters for different endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes
});

export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please slow down.',
});

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Remove potentially dangerous keys
        if (['__proto__', 'constructor', 'prototype'].includes(key)) {
          continue;
        }
        sanitized[key] = sanitize(obj[key]);
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    // Express 5 exposes `query` through a getter, so sanitize the object in
    // place instead of assigning to the read-only request property.
    const query = req.query;
    const sanitizedQuery = sanitize(query);
    for (const key of Object.keys(query)) delete query[key];
    Object.assign(query, sanitizedQuery);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// Request size validation
export const validateRequestSize = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request entity too large',
        code: 'PAYLOAD_TOO_LARGE',
        maxSize: `${maxSize / 1024 / 1024}MB`,
      });
    }

    next();
  };
};

// IP whitelist middleware
export const ipWhitelist = (allowedIps: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    
    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'IP_NOT_ALLOWED',
      });
    }

    next();
  };
};

// Admin route protection
export const adminProtection = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || req.socket.remoteAddress || '';
  
  // Log admin access attempts
  console.log(`Admin access attempt from IP: ${clientIp}, Route: ${req.path}`);
  
  next();
};

// Security check middleware
export const securityCheck = (req: Request, res: Response, next: NextFunction) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\(/i,
    /expression\(/i,
  ];

  const checkSuspicious = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj));
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkSuspicious);
    }
    return false;
  };

  if (checkSuspicious(req.body) || checkSuspicious(req.query) || checkSuspicious(req.params)) {
    return res.status(400).json({
      error: 'Suspicious input detected',
      code: 'SUSPICIOUS_INPUT',
    });
  }

  next();
};

// CORS validation
export const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const allowedOrigins = config.CORS_ORIGIN.split(',').map(o => o.trim());
  
  if (origin && !allowedOrigins.includes(origin)) {
    // Check if it's a loopback address in development
    if (config.NODE_ENV === 'development') {
      try {
        const url = new URL(origin);
        const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
        if (!isLoopback) {
          return res.status(403).json({
            error: 'Origin not allowed',
            code: 'CORS_ERROR',
          });
        }
      } catch {
        return res.status(403).json({
          error: 'Invalid origin',
          code: 'CORS_ERROR',
        });
      }
    } else {
      return res.status(403).json({
        error: 'Origin not allowed',
        code: 'CORS_ERROR',
      });
    }
  }

  next();
};
