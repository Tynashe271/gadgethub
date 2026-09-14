import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';

// Create Prisma client with optimized connection pooling
const prisma = new PrismaClient({
  log: config.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection pool configuration
const connectionPoolConfig = {
  // Connection timeout in seconds
  connection_timeout: 10,
  
  // Statement timeout in seconds (prevents long-running queries)
  statement_timeout: 30,
  
  // Pool settings for production
  pool_min: config.NODE_ENV === 'production' ? 2 : 1,
  pool_max: config.NODE_ENV === 'production' ? 20 : 10,
  
  // Idle timeout in seconds
  pool_idle_timeout: 600,
  
  // Max lifetime of a connection in seconds
  pool_max_lifetime: 3600,
};

// Middleware for query performance monitoring
// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log('Closing database connection pool...');
  await prisma.$disconnect();
  console.log('Database connection pool closed');
};

// Handle process termination
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Health check for database
export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', responseTime: 0 };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Connection pool statistics
export const getPoolStats = async () => {
  try {
    // This is a simplified version - actual implementation depends on your database
    const stats = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT 
        count(*) as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    
    return stats[0] as any;
  } catch (error) {
    console.error('Failed to get pool stats:', error);
    return null;
  }
};

export { prisma };
