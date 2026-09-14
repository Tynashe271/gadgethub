import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, validate, AppError } from '../lib/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { cache } from '../lib/redis.js';

export const adminConsoleRouter = Router();
adminConsoleRouter.use(authenticate, authorize(Role.STORE_MANAGER, Role.SUPER_ADMIN));

const recordTypes = [
  'suppliers', 'purchase-orders', 'email-templates', 'sms-templates',
  'expenses', 'fiscal-records', 'backups', 'system-logs', 'login-activity',
  'security-policies', 'payment-gateways', 'store-settings', 'currency-settings',
] as const;
const recordType = z.enum(recordTypes);
const recordSchema = z.object({
  title: z.string().min(1).max(160),
  status: z.string().min(1).max(50).default('ACTIVE'),
  data: z.record(z.string(), z.unknown()).default({}),
});

const serialize = <T>(value: T): T => JSON.parse(JSON.stringify(value));

adminConsoleRouter.get('/snapshot', asyncHandler(async (_req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const [
    users, products, categories, brands, inventory, orders, payments, returns,
    tradeIns, warranties, warrantyClaims, repairs, tickets, coupons, promotions,
    banners, reviews, notifications, faqs, pages, zones, auditLogs, sessions,
    webhooks, wishlists, carts, priceAlerts, settings,
  ] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, phone: true, firstName: true, lastName: true, avatarUrl: true, role: true, isActive: true, loyaltyPoints: true, createdAt: true, addresses: true, _count: { select: { orders: true, reviews: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.product.findMany({ include: { brand: true, category: true, images: true, specifications: true, variants: { include: { inventory: { include: { movements: { take: 20, orderBy: { createdAt: 'desc' } } } } } }, _count: { select: { orderItems: true, wishlist: true, reviews: true, views: true } } }, orderBy: { updatedAt: 'desc' } }),
    prisma.category.findMany({ include: { children: true, _count: { select: { products: true } } }, orderBy: { name: 'asc' } }),
    prisma.brand.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: 'asc' } }),
    prisma.inventory.findMany({ include: { variant: { include: { product: true } }, movements: { take: 20, orderBy: { createdAt: 'desc' } } }, orderBy: { quantity: 'asc' } }),
    prisma.order.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } }, address: true, items: true, payments: true, delivery: true, returns: { include: { refund: true } }, warranties: { include: { claims: true } } }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.payment.findMany({ include: { order: { include: { user: { select: { firstName: true, lastName: true, email: true } } } }, refunds: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.returnRequest.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } }, order: true, refund: true }, orderBy: { createdAt: 'desc' } }),
    prisma.tradeIn.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.warranty.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } }, order: true, orderItem: true, claims: true } }),
    prisma.warrantyClaim.findMany({ include: { warranty: { include: { orderItem: true, user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } } } }, orderBy: { createdAt: 'desc' } }),
    prisma.repairRequest.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.supportTicket.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.coupon.findMany({ orderBy: { endsAt: 'desc' } }),
    prisma.promotion.findMany({ include: { products: { include: { product: true } } }, orderBy: { startsAt: 'desc' } }),
    prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.review.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } }, product: true, reports: true }, orderBy: { createdAt: 'desc' } }),
    prisma.notification.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.faq.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.contentPage.findMany({ orderBy: { key: 'asc' } }),
    prisma.deliveryZone.findMany({ orderBy: { name: 'asc' } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.session.findMany({ include: { user: { select: { email: true, firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.webhookEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.wishlistItem.groupBy({ by: ['productId'], _count: true, orderBy: { _count: { productId: 'desc' } }, take: 50 }),
    prisma.cart.findMany({ where: { items: { some: {} } }, include: { user: { select: { email: true, firstName: true, lastName: true } }, items: { include: { product: true, variant: true } } }, orderBy: { updatedAt: 'desc' } }),
    prisma.priceAlert.findMany({ include: { user: { select: { email: true, firstName: true, lastName: true } }, product: true } }),
    prisma.setting.findMany({ where: { key: { startsWith: 'admin.' } }, orderBy: { updatedAt: 'desc' } }),
  ]);

  const paid = payments.filter(p => p.status === 'PAID');
  const revenue = (rows: typeof payments) => rows.reduce((sum, p) => sum + Number(p.amount), 0);
  const todayPayments = paid.filter(p => p.createdAt >= today);
  const monthPayments = paid.filter(p => p.createdAt >= month);
  const refundsTotal = payments.flatMap(p => p.refunds).reduce((sum, r) => sum + Number(r.amount), 0);
  const stockValue = inventory.reduce((sum, i) => sum + i.quantity * Number(i.variant.product.price), 0);
  const estimatedCost = stockValue * 0.72;
  const activity = [
    ...orders.slice(0, 20).map(o => ({ type: 'ORDER', title: o.orderNumber, status: o.status, at: o.updatedAt })),
    ...payments.slice(0, 20).map(p => ({ type: 'PAYMENT', title: p.providerReference || p.id, status: p.status, at: p.updatedAt })),
    ...auditLogs.slice(0, 20).map(a => ({ type: a.entity, title: a.action, status: a.entityId || '', at: a.createdAt })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 30);

  res.json(serialize({
    generatedAt: now,
    metrics: {
      todayRevenue: revenue(todayPayments), todayOrders: orders.filter(o => o.createdAt >= today).length,
      monthRevenue: revenue(monthPayments), totalRevenue: revenue(paid), totalOrders: orders.length,
      customers: users.filter(u => u.role === 'CUSTOMER').length, products: products.length,
      pendingOrders: orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
      lowStock: inventory.filter(i => i.quantity - i.reserved <= i.lowStockAt && i.quantity > 0).length,
      outOfStock: inventory.filter(i => i.quantity <= 0).length,
      failedPayments: payments.filter(p => p.status === 'FAILED').length,
      activeReturns: returns.filter(r => ['OPEN', 'IN_PROGRESS', 'WAITING'].includes(r.status)).length,
      warrantyClaims: warrantyClaims.filter(c => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)).length,
      refunds: refundsTotal, discounts: orders.reduce((sum, o) => sum + Number(o.discount), 0),
      stockValue, estimatedCost, estimatedProfit: revenue(paid) - estimatedCost - refundsTotal,
    },
    users, products, categories, brands, inventory, orders, payments, returns, tradeIns,
    warranties, warrantyClaims, repairs, tickets, coupons, promotions, banners, reviews,
    notifications, faqs, pages, zones, auditLogs, sessions, webhooks, wishlists, carts,
    priceAlerts, settings, activity,
  }));
}));

adminConsoleRouter.get('/records/:type', asyncHandler(async (req, res) => {
  const type = validate(recordType, req.params.type);
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: `admin.${type}.` } }, orderBy: { updatedAt: 'desc' } });
  res.json(rows.map(row => ({ id: row.key.split('.').pop(), ...(row.value as object), updatedAt: row.updatedAt })));
}));

adminConsoleRouter.post('/records/:type', asyncHandler(async (req, res) => {
  const type = validate(recordType, req.params.type);
  const data = validate(recordSchema, req.body);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const row = await prisma.setting.create({ data: { key: `admin.${type}.${id}`, value: data as Prisma.InputJsonValue } });
  await prisma.auditLog.create({ data: { actorId: req.auth!.userId, action: 'CREATE', entity: type, entityId: id } });
  res.status(201).json({ id, ...(row.value as object), updatedAt: row.updatedAt });
}));

adminConsoleRouter.patch('/records/:type/:id', asyncHandler(async (req, res) => {
  const type = validate(recordType, req.params.type);
  const data = validate(recordSchema.partial(), req.body);
  const key = `admin.${type}.${String(req.params.id)}`;
  const current = await prisma.setting.findUnique({ where: { key } });
  if (!current) throw new AppError(404, 'Record not found');
  const value = { ...(current.value as object), ...data };
  const row = await prisma.setting.update({ where: { key }, data: { value: value as Prisma.InputJsonValue } });
  await prisma.auditLog.create({ data: { actorId: req.auth!.userId, action: 'UPDATE', entity: type, entityId: String(req.params.id) } });
  res.json({ id: req.params.id, ...(row.value as object), updatedAt: row.updatedAt });
}));

adminConsoleRouter.delete('/records/:type/:id', asyncHandler(async (req, res) => {
  const type = validate(recordType, req.params.type);
  const id = String(req.params.id);
  await prisma.setting.delete({ where: { key: `admin.${type}.${id}` } });
  await prisma.auditLog.create({ data: { actorId: req.auth!.userId, action: 'DELETE', entity: type, entityId: id } });
  res.status(204).send();
}));

adminConsoleRouter.post('/staff', authorize(Role.SUPER_ADMIN), asyncHandler(async (req, res) => {
  const data = validate(z.object({ email: z.string().email(), password: z.string().min(12).max(72), firstName: z.string().min(1), lastName: z.string().min(1), phone: z.string().optional(), role: z.nativeEnum(Role).refine(v => v !== Role.CUSTOMER) }), req.body);
  const user = await prisma.user.create({ data: { ...data, email: data.email.toLowerCase(), passwordHash: await bcrypt.hash(data.password, 12) }, select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true } });
  await prisma.auditLog.create({ data: { actorId: req.auth!.userId, action: 'CREATE', entity: 'Staff', entityId: user.id } });
  res.status(201).json(user);
}));

adminConsoleRouter.get('/search', asyncHandler(async (req, res) => {
  const q = validate(z.string().trim().min(1).max(100), req.query.q);
  const [products, users, orders, payments] = await Promise.all([
    prisma.product.findMany({ where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }] }, take: 20 }),
    prisma.user.findMany({ where: { OR: [{ email: { contains: q, mode: 'insensitive' } }, { firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }] }, select: { id: true, email: true, firstName: true, lastName: true, role: true }, take: 20 }),
    prisma.order.findMany({ where: { orderNumber: { contains: q, mode: 'insensitive' } }, include: { user: true }, take: 20 }),
    prisma.payment.findMany({ where: { providerReference: { contains: q, mode: 'insensitive' } }, include: { order: true }, take: 20 }),
  ]);
  res.json(serialize({ products, users, orders, payments }));
}));

adminConsoleRouter.post('/bulk', asyncHandler(async (req, res) => {
  const input = validate(z.object({
    resource: z.enum(['products', 'inventory']),
    ids: z.array(z.string()).min(1).max(500),
    action: z.enum(['price', 'category', 'active', 'stock']),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }), req.body);
  let changed = 0;
  if (input.resource === 'products') {
    if (input.action === 'price') {
      const value = z.number().positive().parse(input.value);
      changed = (await prisma.product.updateMany({ where: { id: { in: input.ids } }, data: { price: value } })).count;
    } else if (input.action === 'category') {
      const value = z.string().min(1).parse(input.value);
      if (!await prisma.category.findUnique({ where: { id: value } })) throw new AppError(404, 'Category not found');
      changed = (await prisma.product.updateMany({ where: { id: { in: input.ids } }, data: { categoryId: value } })).count;
    } else if (input.action === 'active') {
      const value = z.boolean().parse(input.value);
      changed = (await prisma.product.updateMany({ where: { id: { in: input.ids } }, data: { isActive: value } })).count;
    } else throw new AppError(400, 'Unsupported product bulk action');
  } else {
    if (input.action !== 'stock') throw new AppError(400, 'Inventory supports stock adjustments only');
    const quantity = z.number().int().parse(input.value);
    const rows = await prisma.inventory.findMany({ where: { id: { in: input.ids } } });
    await prisma.$transaction(rows.map(row => prisma.inventory.update({ where: { id: row.id }, data: { quantity: { increment: quantity }, movements: { create: { type: 'ADJUSTMENT', quantity, reason: 'Admin bulk adjustment' } } } })));
    changed = rows.length;
  }
  await prisma.auditLog.create({ data: { actorId: req.auth!.userId, action: 'BULK_UPDATE', entity: input.resource, metadata: { ids: input.ids, action: input.action, value: input.value, changed } } });
  await cache.invalidatePattern('products:*');
  res.json({ changed });
}));

adminConsoleRouter.post('/import/:type', authorize(Role.SUPER_ADMIN), asyncHandler(async (req, res) => {
  const type = validate(z.enum(['products', 'customers', 'orders']), req.params.type);
  const rows = validate(z.array(z.record(z.string(), z.unknown())).min(1).max(1000), req.body);
  let imported = 0;
  const errors: Array<{ row: number; message: string }> = [];
  for (let index = 0; index < rows.length; index++) {
    try {
      const row = rows[index]!;
      if (type === 'products') {
        const data = validate(z.object({ name: z.string().min(2), sku: z.string().min(1), price: z.coerce.number().positive(), categoryId: z.string(), brandId: z.string(), description: z.string().default('Imported product'), condition: z.enum(['BRAND_NEW','EXCELLENT','GOOD','REFURBISHED']).default('BRAND_NEW'), isActive: z.coerce.boolean().default(true) }), row);
        const slug = String(row.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
        const reference = String(row.reference || `IMP-${data.sku}`);
        await prisma.product.upsert({ where: { sku: data.sku }, create: { ...data, slug, reference }, update: { ...data, slug } });
      } else if (type === 'customers') {
        const data = validate(z.object({ email: z.string().email(), firstName: z.string().min(1), lastName: z.string().min(1), phone: z.string().optional(), password: z.string().min(12).max(72), isActive: z.coerce.boolean().default(true) }), row);
        const passwordHash = await bcrypt.hash(data.password, 12);
        await prisma.user.upsert({ where: { email: data.email.toLowerCase() }, create: { email: data.email.toLowerCase(), firstName: data.firstName, lastName: data.lastName, phone: data.phone, isActive: data.isActive, passwordHash, role: 'CUSTOMER' }, update: { firstName: data.firstName, lastName: data.lastName, phone: data.phone, isActive: data.isActive } });
      } else {
        const data = validate(z.object({ orderNumber: z.string(), status: z.enum(['PLACED','PAYMENT_CONFIRMED','PREPARING','DISPATCHED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED']) }), row);
        const result = await prisma.order.updateMany({ where: { orderNumber: data.orderNumber }, data: { status: data.status } });
        if (!result.count) throw new Error('Order not found; order imports update existing orders only');
      }
      imported++;
    } catch (error) { errors.push({ row: index + 2, message: error instanceof Error ? error.message : 'Invalid row' }); }
  }
  await prisma.auditLog.create({ data: { actorId: req.auth!.userId, action: 'IMPORT', entity: type, metadata: { imported, failed: errors.length } } });
  if (type === 'products') await cache.invalidatePattern('products:*');
  res.status(errors.length ? 207 : 200).json({ imported, failed: errors.length, errors });
}));
