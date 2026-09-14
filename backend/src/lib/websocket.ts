import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from './prisma.js';
import logger from './logger.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN.split(',').map(origin => origin.trim()),
      credentials: true,
    },
    path: '/socket.io/',
  });

  // Authentication middleware
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
      }) as { sub: string; role: string; jti: string };
      
      // Verify session is still valid
      const session = await prisma.session.findFirst({
        where: {
          id: decoded.jti,
          userId: decoded.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        return next(new Error('Invalid or expired session'));
      }

      socket.userId = decoded.sub;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: any) => {
    logger.info(`User connected: ${socket.userId}`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-based rooms for admin/staff
    if (socket.userRole === 'SUPER_ADMIN' || socket.userRole === 'STORE_MANAGER') {
      socket.join('admin');
    }
    if (socket.userRole === 'SUPPORT') {
      socket.join('support');
    }
    if (socket.userRole === 'DELIVERY') {
      socket.join('delivery');
    }

    // Handle order updates
    socket.on('order:subscribe', (orderId: string) => {
      socket.join(`order:${orderId}`);
      logger.info(`User ${socket.userId} subscribed to order ${orderId}`);
    });

    socket.on('order:unsubscribe', (orderId: string) => {
      socket.leave(`order:${orderId}`);
      logger.info(`User ${socket.userId} unsubscribed from order ${orderId}`);
    });

    // Handle inventory subscriptions
    if (socket.userRole === 'INVENTORY' || socket.userRole === 'PRODUCT') {
      socket.on('inventory:subscribe', () => {
        socket.join('inventory-updates');
        logger.info(`User ${socket.userId} subscribed to inventory updates`);
      });

      socket.on('inventory:unsubscribe', () => {
        socket.leave('inventory-updates');
        logger.info(`User ${socket.userId} unsubscribed from inventory updates`);
      });
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.userId}`);
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

// Broadcasting functions for different events
export const broadcast = {
  // Notify user about their order updates
  async orderUpdate(orderId: string, userId: string, data: any) {
    if (!io) return;
    io.to(`user:${userId}`).to(`order:${orderId}`).emit('order:updated', data);
  },

  // Notify admins about new orders
  async newOrder(data: any) {
    if (!io) return;
    io.to('admin').emit('order:created', data);
  },

  // Notify about inventory changes
  async inventoryUpdate(productId: string, data: any) {
    if (!io) return;
    io.to('inventory-updates').emit('inventory:updated', { productId, ...data });
  },

  // Send notification to specific user
  async userNotification(userId: string, notification: any) {
    if (!io) return;
    io.to(`user:${userId}`).emit('notification:new', notification);
  },

  // Broadcast system-wide announcement
  async systemAnnouncement(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    if (!io) return;
    io.emit('system:announcement', { message, type, timestamp: new Date() });
  },

  // Notify support staff about new tickets
  async newSupportTicket(ticket: any) {
    if (!io) return;
    io.to('support').to('admin').emit('support:ticket_created', ticket);
  },

  // Notify delivery staff about new deliveries
  async newDelivery(delivery: any) {
    if (!io) return;
    io.to('delivery').emit('delivery:assigned', delivery);
  },
};
