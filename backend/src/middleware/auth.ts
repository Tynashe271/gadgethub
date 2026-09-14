import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { config } from '../config.js';
import { AppError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

type Claims = { sub: string; role: Role; jti: string };

const isClaims = (value: unknown): value is Claims => {
  if (!value || typeof value !== 'object') return false;
  const claims = value as Record<string, unknown>;
  return typeof claims.sub === 'string' && typeof claims.jti === 'string' && typeof claims.role === 'string';
};

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return next(new AppError(401, 'Authentication required'));
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    });
    if (!isClaims(decoded)) throw new Error('Invalid token claims');
    const claims = decoded;
    const session=await prisma.session.findFirst({where:{id:claims.jti,userId:claims.sub,revokedAt:null,expiresAt:{gt:new Date()}}});
    if(!session)throw new Error('Revoked session');
    req.auth = { userId: claims.sub, role: claims.role, sessionId: claims.jti };
    next();
  } catch { next(new AppError(401, 'Invalid or expired token')); }
}
export const authorize = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) =>
  req.auth && roles.includes(req.auth.role) ? next() : next(new AppError(403, 'Insufficient permission'));
