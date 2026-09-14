import express from 'express';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { cartRouter } from './routes/cart.js';
import { ordersRouter } from './routes/orders.js';
import { profileRouter } from './routes/profile.js';
import { catalogRouter } from './routes/catalog.js';
import { discoveryRouter } from './routes/discovery.js';
import { servicesRouter } from './routes/services.js';
import { reviewsRouter } from './routes/reviews.js';
import { notificationsRouter } from './routes/notifications.js';
import { loyaltyRouter } from './routes/loyalty.js';
import { commerceRouter } from './routes/commerce.js';
import { contentRouter } from './routes/content.js';
import { authenticityRouter } from './routes/authenticity.js';
import { adminRouter } from './routes/admin.js';
import { adminConsoleRouter } from './routes/admin-console.js';
import { errorHandler, notFound } from './lib/http.js';
import { providersRouter } from './routes/providers.js';
import { assistantRouter } from './routes/assistant.js';
import { webhooksRouter } from './routes/webhooks.js';
import { metrics, metricsMiddleware } from './lib/metrics.js';
import { performHealthCheck, getLivenessHealth, getReadinessHealth } from './lib/healthCheck.js';
import { validateConfigOnStartup } from './lib/configValidator.js';
import { 
  securityHeaders, 
  authRateLimiter, 
  apiRateLimiter, 
  strictRateLimiter,
  sanitizeInput,
  validateRequestSize,
  securityCheck 
} from './lib/security.js';
import { requestLogger, requestContext } from './lib/logger.js';

// Validate configuration on startup
validateConfigOnStartup();

export const app = express();
app.disable('x-powered-by');
app.disable('etag');

// Security headers
app.use(securityHeaders);

// CORS configuration
const allowedOrigins = new Set(
  config.CORS_ORIGIN.split(',').map((origin) => origin.trim())
);
const isLoopbackDevelopmentOrigin = (origin: string) => {
  if (config.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    );
  } catch {
    return false;
  }
};
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin) || isLoopbackDevelopmentOrigin(origin));
    },
    credentials: true,
  })
);

// Reject oversized requests before allocating memory for their bodies.
app.use(validateRequestSize(10 * 1024 * 1024)); // 10MB max

// Body parsing must run before validation/sanitization so req.body is available.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Security middleware
app.use(sanitizeInput);
app.use(securityCheck);

// Request context and logging
app.use(requestContext);
app.use(requestLogger);

// Metrics
app.use(metricsMiddleware);
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Apply global API rate limiting
app.use('/api', apiRateLimiter);

// Apply stricter rate limiting to auth routes
app.use('/api/v1/auth', authRateLimiter);
app.get('/api/v1', (_req, res) =>
  res.json({
    name: 'GadgetHub API',
    version: 'v1',
    status: 'running',
    endpoints: {
      health: '/api/v1/health',
      authentication: '/api/v1/auth',
      products: '/api/v1/products',
      search: '/api/v1/search',
      cart: '/api/v1/cart',
      orders: '/api/v1/orders',
      profile: '/api/v1/profile',
      catalog: '/api/v1/catalog',
      discovery: '/api/v1/discovery',
      services: '/api/v1/services',
      reviews: '/api/v1/reviews',
      commerce: '/api/v1/commerce',
      content: '/api/v1/content',
      admin: '/api/v1/admin',
    },
  })
);
app.get('/api/v1/health', async (_req, res) => {
  const health = await performHealthCheck();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Kubernetes-style health checks
app.get('/healthz', async (_req, res) => {
  const health = await getLivenessHealth();
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/readyz', async (_req, res) => {
  const readiness = await getReadinessHealth();
  const statusCode = readiness.status === 'ready' ? 200 : 503;
  res.status(statusCode).json(readiness);
});
app.get('/favicon.ico', (_req, res) => res.status(204).send());
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.resolve(process.cwd(), 'uploads'), { maxAge: '7d', immutable: true }));
app.get('/metrics', (req, res) => {
  if (
    process.env.METRICS_TOKEN &&
    req.headers.authorization !== `Bearer ${process.env.METRICS_TOKEN}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.set('Content-Type', metrics.contentType);
  return res.send(metrics.metrics());
});
app.use('/api/v1/admin', strictRateLimiter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1/discovery', discoveryRouter);
app.use('/api/v1/services', servicesRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/loyalty', loyaltyRouter);
app.use('/api/v1/commerce', commerceRouter);
app.use('/api/v1/content', contentRouter);
app.use('/api/v1/authenticity', authenticityRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/admin-console', adminConsoleRouter);
app.use('/api/v1/providers', providersRouter);
app.use('/api/v1/assistant', assistantRouter);
app.use('/api/v1/webhooks', webhooksRouter);
app.use(notFound);
app.use(errorHandler);
