import type { Request } from 'express';
import { prisma } from './prisma.js';
export const audit = (req: Request, action: string, entity: string, entityId?: string, metadata?: object) =>
  prisma.auditLog.create({ data: { actorId: req.auth?.userId, action, entity, entityId, ipAddress: req.ip, metadata } });
