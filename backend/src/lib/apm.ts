import { Histogram, Registry, Counter, Gauge } from 'prom-client';
import logger from './logger.js';

// Custom metrics registry for APM
const apmRegistry = new Registry();

// HTTP request duration histogram
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [apmRegistry],
});

// Database query duration histogram
const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [apmRegistry],
});

// External API call duration histogram
const externalApiDuration = new Histogram({
  name: 'external_api_duration_seconds',
  help: 'Duration of external API calls in seconds',
  labelNames: ['service', 'operation', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [apmRegistry],
});

// Cache operation counter
const cacheOperations = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status'],
  registers: [apmRegistry],
});

// Active connections gauge
const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type'],
  registers: [apmRegistry],
});

// Error rate counter
const errorRate = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity'],
  registers: [apmRegistry],
});

// Business metrics
const orderValue = new Histogram({
  name: 'order_value_usd',
  help: 'Order value in USD',
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [apmRegistry],
});

const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  registers: [apmRegistry],
});

// Performance monitoring class
export class APMService {
  private startTimes: Map<string, number> = new Map();

  // HTTP request monitoring
  startHttpRequest(requestId: string) {
    this.startTimes.set(`http:${requestId}`, Date.now());
  }

  endHttpRequest(requestId: string, method: string, route: string, statusCode: number) {
    const startTime = this.startTimes.get(`http:${requestId}`);
    if (startTime) {
      const duration = (Date.now() - startTime) / 1000;
      httpRequestDuration.observe(
        { method, route, status_code: statusCode },
        duration
      );
      this.startTimes.delete(`http:${requestId}`);
      
      // Log slow requests
      if (duration > 1) {
        logger.warn(`Slow request detected: ${method} ${route} took ${duration.toFixed(2)}s`);
      }
    }
  }

  // Database query monitoring
  startDbQuery(operation: string, table: string) {
    const queryId = `db:${operation}:${table}:${Date.now()}`;
    this.startTimes.set(queryId, Date.now());
    return queryId;
  }

  endDbQuery(queryId: string, operation: string, table: string) {
    const startTime = this.startTimes.get(queryId);
    if (startTime) {
      const duration = (Date.now() - startTime) / 1000;
      dbQueryDuration.observe({ operation, table }, duration);
      this.startTimes.delete(queryId);
      
      // Log slow queries
      if (duration > 0.1) {
        logger.warn(`Slow database query: ${operation} on ${table} took ${duration.toFixed(3)}s`);
      }
    }
  }

  // External API monitoring
  startExternalApiCall(service: string, operation: string) {
    const callId = `api:${service}:${operation}:${Date.now()}`;
    this.startTimes.set(callId, Date.now());
    return callId;
  }

  endExternalApiCall(callId: string, service: string, operation: string, status: string) {
    const startTime = this.startTimes.get(callId);
    if (startTime) {
      const duration = (Date.now() - startTime) / 1000;
      externalApiDuration.observe({ service, operation, status }, duration);
      this.startTimes.delete(callId);
    }
  }

  // Cache operation tracking
  trackCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', status: 'success' | 'error') {
    cacheOperations.inc({ operation, status });
  }

  // Connection tracking
  setActiveConnections(type: string, count: number) {
    activeConnections.set({ type }, count);
  }

  // Error tracking
  trackError(type: string, severity: 'low' | 'medium' | 'high' | 'critical') {
    errorRate.inc({ type, severity });
  }

  // Business metrics
  trackOrderValue(value: number) {
    orderValue.observe(value);
  }

  trackUserRegistration() {
    userRegistrations.inc();
  }

  // Health check metrics
  async getSystemHealth() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
    };
  }

  // Get performance summary
  async getPerformanceSummary() {
    const health = await this.getSystemHealth();
    
    return {
      system: health,
      metrics: {
        httpRequests: await httpRequestDuration.get(),
        dbQueries: await dbQueryDuration.get(),
        externalApis: await externalApiDuration.get(),
        cacheOperations: await cacheOperations.get(),
        activeConnections: await activeConnections.get(),
        errors: await errorRate.get(),
      },
    };
  }

  // Get metrics for Prometheus
  getMetrics() {
    return apmRegistry.metrics();
  }
}

export const apm = new APMService();

// Middleware for automatic HTTP request tracking
export function apmMiddleware(req: any, res: any, next: any) {
  const requestId = req.id || `req-${Date.now()}`;
  req.apmRequestId = requestId;
  
  apm.startHttpRequest(requestId);
  
  res.on('finish', () => {
    apm.endHttpRequest(
      requestId,
      req.method,
      req.route?.path || req.path,
      res.statusCode
    );
  });
  
  next();
}