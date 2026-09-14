import client from 'prom-client';
import type { NextFunction, Request, Response } from 'express';

client.collectDefaultMetrics();

const http = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

const normalizePath = (path: string): string => {
  return path
    .replace(/\/\d+/g, '/{id}')
    .replace(/\/[a-f0-9-]{36}/g, '/{uuid}')
    .replace(/\/[a-z0-9-]+/g, (match) => {
      if (match.match(/^\/(api|v\d+|auth|products|orders|admin)$/)) return match;
      return '/{param}';
    });
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const end = http.startTimer();
  res.on('finish', () =>
    end({
      method: req.method,
      route: normalizePath(req.route?.path ?? req.path),
      status: String(res.statusCode),
    })
  );
  next();
};

export const metrics = client.register;
