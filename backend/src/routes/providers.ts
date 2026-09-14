import { NotificationChannel, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../lib/http.js';
import { deliverNotification } from '../lib/notifications.js';
import { prisma } from '../lib/prisma.js';
import { providerHealth, sendWhatsapp, signedCloudinaryAvatar, signedUpload } from '../lib/providers.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const providersRouter = Router();

providersRouter.get('/health', authenticate, authorize(Role.SUPER_ADMIN), (_q, res) =>
  res.json(providerHealth()),
);

providersRouter.post('/uploads/sign', authenticate, asyncHandler(async (req, res) => {
  const data = validate(z.object({
    fileName: z.string().min(1).max(180),
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  }), req.body);
  res.json(await signedUpload(data.fileName, data.contentType));
}));

providersRouter.post('/uploads/avatar/sign', authenticate, asyncHandler(async (req, res) =>
  res.json(signedCloudinaryAvatar(req.auth!.userId)),
));

providersRouter.post('/push/subscribe', authenticate, asyncHandler(async (req, res) => {
  const data = validate(z.object({
    endpoint: z.url(),
    keys: z.object({ p256dh: z.string(), auth: z.string() }),
  }), req.body);
  res.status(201).json(await prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: { endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth, userId: req.auth!.userId },
    update: { p256dh: data.keys.p256dh, auth: data.keys.auth, userId: req.auth!.userId },
  }));
}));

providersRouter.post('/send', authenticate, authorize(Role.SUPPORT, Role.STORE_MANAGER, Role.SUPER_ADMIN), asyncHandler(async (req, res) => {
  const data = validate(z.object({
    channel: z.nativeEnum(NotificationChannel),
    userId: z.string(),
    subject: z.string().default('GadgetHub notification'),
    body: z.string().min(1),
  }), req.body);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: data.userId },
    select: { id: true, email: true, phone: true },
  });
  const receipt = await deliverNotification(user, data.channel, data.subject, data.body);
  res.status(202).json({ accepted: true, channel: data.channel, receipt });
}));

// Direct-number endpoint retained for support messages to contacts without accounts.
providersRouter.post('/whatsapp/send', authenticate, authorize(Role.SUPPORT, Role.STORE_MANAGER, Role.SUPER_ADMIN), asyncHandler(async (req, res) => {
  const data = validate(z.object({ to: z.string().min(7), body: z.string().min(1) }), req.body);
  res.status(202).json({ accepted: true, receipt: await sendWhatsapp(data.to, data.body) });
}));
