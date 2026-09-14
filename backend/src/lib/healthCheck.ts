import { prisma, checkDatabaseHealth } from './prisma.js';
// import { redis } from './redis.js';
import { config } from '../config.js';
import os from 'node:os';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: ServiceHealth;
    redis?: ServiceHealth;
    memory: MemoryHealth;
    cpu?: CpuHealth;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

interface MemoryHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  used: number;
  total: number;
  percentage: number;
}

interface CpuHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  usage: number;
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const checks: HealthCheckResult['checks'] = {
    database: await checkDatabase(),
    memory: checkMemory(),
  };

  // Add Redis check if configured
  // if (process.env.REDIS_HOST) {
  //   checks.redis = await checkRedis();
  // }

  // Add CPU check in production
  if (config.NODE_ENV === 'production') {
    checks.cpu = checkCpu();
  }

  // Determine overall health
  const allChecks = Object.values(checks);
  const hasUnhealthy = allChecks.some(check => check.status === 'unhealthy');
  const hasDegraded = allChecks.some(check => check.status === 'degraded');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (hasUnhealthy) {
    overallStatus = 'unhealthy';
  } else if (hasDegraded) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };
}

async function checkDatabase(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    const result = await checkDatabaseHealth();
    const responseTime = Date.now() - startTime;
    
    if (result.status === 'unhealthy') {
      return {
        status: 'unhealthy',
        responseTime,
        error: result.error,
      };
    }

    if (responseTime > 1000) {
      return {
        status: 'unhealthy',
        responseTime,
        error: 'Database response time too slow',
      };
    }

    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

// async function checkRedis(): Promise<ServiceHealth> {
//   const startTime = Date.now();
//   try {
//     await redis.ping();
//     const responseTime = Date.now() - startTime;
    
//     if (responseTime > 500) {
//       return {
//         status: 'unhealthy',
//         responseTime,
//         error: 'Redis response time too slow',
//       };
//     }

//     return {
//       status: 'healthy',
//       responseTime,
//     };
//   } catch (error) {
//     return {
//       status: 'unhealthy',
//       error: error instanceof Error ? error.message : 'Unknown Redis error',
//     };
//   }
// }

function checkMemory(): MemoryHealth {
  // Compare the process RSS with system memory. heapUsed/heapTotal measures
  // V8's currently allocated heap and often appears nearly full even when the
  // process and host have ample memory available.
  const used = process.memoryUsage().rss / 1024 / 1024;
  const total = os.totalmem() / 1024 / 1024;
  const percentage = (used / total) * 100;

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (percentage > 90) {
    status = 'unhealthy';
  } else if (percentage > 70) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return {
    status,
    used: Math.round(used),
    total: Math.round(total),
    percentage: Math.round(percentage),
  };
}

function checkCpu(): CpuHealth {
  const cpus = os.cpus();
  const loadAverage = os.loadavg();
  const cpuCount = cpus.length;
  const usage = ((loadAverage[0] ?? 0) / Math.max(cpuCount, 1)) * 100;

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (usage > 90) {
    status = 'unhealthy';
  } else if (usage > 70) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return {
    status,
    usage: Math.round(usage),
  };
}

export async function getLivenessHealth(): Promise<{ status: string }> {
  try {
    // Quick check - just ensure process is running
    return { status: 'ok' };
  } catch {
    return { status: 'error' };
  }
}

export async function getReadinessHealth(): Promise<{ status: string; checks: Record<string, boolean> }> {
  const checks: Record<string, boolean> = {};
  
  try {
    // Check database connectivity
    const dbHealth = await checkDatabaseHealth();
    checks.database = dbHealth.status === 'healthy';
  } catch {
    checks.database = false;
  }

  // Check Redis if configured
  // if (process.env.REDIS_HOST) {
  //   try {
  //     await redis.ping();
  //     checks.redis = true;
  //   } catch {
  //     checks.redis = false;
  //   }
  // }

  const isReady = Object.values(checks).every(check => check === true);
  
  return {
    status: isReady ? 'ready' : 'not_ready',
    checks,
  };
}
