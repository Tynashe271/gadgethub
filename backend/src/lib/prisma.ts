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

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prismaExport = globalForPrisma.prisma ?? prisma;
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaExport;

// Export both for compatibility
export { prisma };
