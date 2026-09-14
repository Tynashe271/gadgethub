import { app } from './app.js';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';
// import { redis } from './lib/redis.js';
// import { initializeWebSocket } from './lib/websocket.js';
import { createServer } from 'http';

const httpServer = createServer(app);
// initializeWebSocket(httpServer);

const server=httpServer.listen(config.PORT,()=>console.log(`GadgetHub API listening on http://localhost:${config.PORT}/api/v1`));
const shutdown=async()=>{
  server.close();
  await prisma.$disconnect();
  // await redis.disconnect();
};
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
