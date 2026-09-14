import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { AppError, asyncHandler, validate } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

export const loyaltyRouter = Router();
loyaltyRouter.use(authenticate);

loyaltyRouter.get('/', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: {
      loyaltyPoints: true,
      loyaltyTransactions: { orderBy: { createdAt: 'desc' } },
    },
  });
  const points = user?.loyaltyPoints ?? 0;
  res.json({
    ...user,
    level: points >= 5000 ? 'GOLD' : points >= 1000 ? 'SILVER' : 'BRONZE',
    rules: { pointsPerUsd: 1, redemptionRate: 100, minimumRedemption: 100 },
  });
}));

loyaltyRouter.post('/redeem', asyncHandler(async (req, res) => {
  const { points } = validate(z.object({ points: z.number().int().min(100).multipleOf(100) }), req.body);
  const rewardValue = points / 100;
  const code = `GH-REWARD-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 86400000);

  const result = await prisma.$transaction(async (tx) => {
    const debited = await tx.user.updateMany({
      where: { id: req.auth!.userId, loyaltyPoints: { gte: points } },
      data: { loyaltyPoints: { decrement: points } },
    });
    if (!debited.count) throw new AppError(409, 'Insufficient points');
    const user = await tx.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    await tx.loyaltyTransaction.create({
      data: { userId: user.id, points: -points, reason: 'REDEMPTION', reference: code, balance: user.loyaltyPoints },
    });
    await tx.coupon.create({
      data: { code, type: 'FIXED', value: rewardValue, startsAt: now, endsAt: expiresAt, usageLimit: 1 },
    });
    return { balance: user.loyaltyPoints };
  });

  res.status(201).json({ ...result, points, rewardValue, currency: 'USD', couponCode: code, expiresAt });
}));
