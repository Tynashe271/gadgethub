import { Router, type Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler, validate } from '../lib/http.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'node:crypto';
import { checkPhoneVerification, startPhoneVerification } from '../lib/providers.js';
import rateLimit from 'express-rate-limit';
import { normalizePhone } from '../lib/phone.js';

export const authRouter = Router();

// Normalize IP address to handle both IPv4 and IPv6
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]!.trim();
  }
  const remoteAddress = (req.socket as any)?.remoteAddress;
  return remoteAddress ?? req.ip ?? '';
};

// Stricter rate limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per window
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => config.NODE_ENV === 'test' || req.method === 'GET',
  keyGenerator: (req) => getClientIp(req),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  keyGenerator: (req) => {
    const email = (req.body as any)?.email || 'unknown';
    return `${getClientIp(req)}:${email}`;
  },
});

const registerSchema = z.object({
  email: z.email(),
  phone: z.string().min(7).transform(normalizePhone).optional(),
  password: z.string().min(8).max(72),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const sign = async (id: string, role: string) => {
  const jti = crypto.randomUUID();
  await prisma.session.create({
    data: {
      id: jti,
      userId: id,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return jwt.sign(
    { sub: id, role, jti },
    config.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    }
  );
};

authRouter.get('/', (_req, res) =>
  res.json({
    service: 'Database-backed authentication',
    endpoints: {
      register: { method: 'POST', path: '/api/v1/auth/register' },
      login: { method: 'POST', path: '/api/v1/auth/login' },
      logout: {
        method: 'POST',
        path: '/api/v1/auth/logout',
        authentication: 'Bearer token',
      },
      currentUser: {
        method: 'GET',
        path: '/api/v1/auth/me',
        authentication: 'Bearer token',
      },
      forgotPassword: { method: 'POST', path: '/api/v1/auth/forgot-password' },
      resetPassword: { method: 'POST', path: '/api/v1/auth/reset-password' },
    },
    persistence: {
      users: 'User table',
      sessions: 'Session table',
      passwordResets: 'PasswordReset table',
    },
  })
);

const postOnly = (endpoint: string) => (
  _req: import('express').Request,
  res: import('express').Response
) =>
  res
    .status(405)
    .set('Allow', 'POST')
    .json({
      error: 'Method not allowed',
      message: `Use POST ${endpoint} with a JSON request body`,
    });

authRouter.get('/register', postOnly('/api/v1/auth/register'));
authRouter.get('/login', postOnly('/api/v1/auth/login'));

authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = validate(registerSchema, req.body);
    if (
      await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.email.toLowerCase() },
            ...(data.phone ? [{ phone: data.phone }] : []),
          ],
        },
      })
    ) {
      throw new AppError(409, 'Email or phone is already registered');
    }

    const { password, ...profile } = data;
    const user = await prisma.user.create({
      data: {
        ...profile,
        email: profile.email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
      },
    });

    res.status(201).json({ user, token: await sign(user.id, user.role) });
  })
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({ email: z.email(), password: z.string().min(1) }),
      req.body
    );
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (
      !user?.isActive ||
      !(await bcrypt.compare(data.password, user.passwordHash))
    ) {
      throw new AppError(401, 'Invalid credentials');
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      token: await sign(user.id, user.role),
    });
  })
);

authRouter.post(
  '/demo-login',
  asyncHandler(async (_req, res) => {
    if (config.NODE_ENV === 'production') throw new AppError(404, 'Not found');
    const email = 'demo@gadgethub.local';
    const user = await prisma.user.upsert({
      where: { email },
      update: { isActive: true },
      create: {
        email,
        passwordHash: await bcrypt.hash('Demo@12345', 12),
        firstName: 'Demo',
        lastName: 'Customer',
      },
      select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, role: true },
    });
    res.json({ user, token: await sign(user.id, user.role) });
  })
);

authRouter.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.session.update({
      where: { id: req.auth!.sessionId },
      data: { revokedAt: new Date() },
    });
    res.status(204).send();
  })
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    });

    if (!user) throw new AppError(404, 'User not found');
    res.json(user);
  })
);

authRouter.post(
  '/change-password',
  authenticate,
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(72),
      }),
      req.body
    );
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
      throw new AppError(401, 'Current password is incorrect');
    }
    if (await bcrypt.compare(data.newPassword, user.passwordHash)) {
      throw new AppError(400, 'New password must be different');
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(data.newPassword, 12) },
      }),
      prisma.session.updateMany({
        where: { userId: user.id, id: { not: req.auth!.sessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    res.json({ message: 'Password updated' });
  })
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = validate(z.object({ email: z.email() }), req.body);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user?.phone) {
      return res.json({
        message: 'If an eligible account exists, a verification code has been sent',
      });
    }
    const phone = normalizePhone(user.phone);
    let channel: 'sms' | 'whatsapp' = 'sms';
    try {
      await startPhoneVerification(phone, channel);
    } catch (smsError) {
      channel = 'whatsapp';
      try {
        await startPhoneVerification(phone, channel);
      } catch (whatsappError) {
        const error = whatsappError as { code?: number; message?: string };
        console.error('[Twilio Verify]', { code: error.code, message: error.message });
        throw new AppError(502, 'Twilio Verify could not send a code. Trial accounts require this recipient number to be verified in Twilio.');
      }
    }

    res.json({
      message: `Verification code sent by ${channel === 'sms' ? 'SMS' : 'WhatsApp'}`,
      verificationRequired: true,
      channel,
    });
  })
);

authRouter.post(
  '/verify-reset-code',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = validate(z.object({ email: z.email(), code: z.string().regex(/^\d{4,10}$/) }), req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user?.phone) throw new AppError(400, 'Invalid or expired verification code');

    const verification = await checkPhoneVerification(normalizePhone(user.phone), data.code);
    if (verification.status !== 'approved') throw new AppError(400, 'Invalid or expired verification code');

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    res.json({ resetUrl: `/reset-password?token=${encodeURIComponent(token)}` });
  }),
);

authRouter.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const d = validate(
      z.object({
        token: z.string(),
        password: z.string().min(8).max(72),
      }),
      req.body
    );

    const tokenHash = crypto
      .createHash('sha256')
      .update(d.token)
      .digest('hex');

    const record = await prisma.passwordReset.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await bcrypt.hash(d.password, 12) },
      }),
      prisma.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Password updated' });
  })
);
