import { NotificationChannel, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../lib/http.js';
import { deliverNotification } from '../lib/notifications.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get('/', asyncHandler(async (req, res) =>
  res.json(await prisma.notification.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })),
));

notificationsRouter.patch('/:id/read', asyncHandler(async (req, res) =>
  res.json(await prisma.notification.updateMany({
    where: { id: String(req.params.id), userId: req.auth!.userId },
    data: { readAt: new Date() },
  })),
));

notificationsRouter.post('/send', authorize(Role.SUPPORT, Role.STORE_MANAGER, Role.SUPER_ADMIN), asyncHandler(async (req, res) => {
  const data = validate(z.object({
    userId: z.string(),
    title: z.string().min(1),
    body: z.string().min(1),
    type: z.string().default('DIRECT'),
    channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.IN_APP),
  }), req.body);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: data.userId },
    select: { id: true, email: true, phone: true },
  });
  const receipt = await deliverNotification(user, data.channel, data.title, data.body, data.type);
  res.status(data.channel === NotificationChannel.IN_APP ? 201 : 202).json({
    accepted: true,
    channel: data.channel,
    receipt,
  });
}));
