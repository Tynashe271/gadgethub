import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler, validate } from '../lib/http.js';
import { authenticate } from '../middleware/auth.js';

export const cartRouter = Router();
cartRouter.use(authenticate);
const cartInclude = { items: { include: { product: { include: { images: { take: 1 } } }, variant: { include: { inventory: true } } } } } as const;
cartRouter.get('/', asyncHandler(async (req, res) => { res.json(await prisma.cart.upsert({ where: { userId: req.auth!.userId }, create: { userId: req.auth!.userId }, update: {}, include: cartInclude })); }));
cartRouter.post('/items', asyncHandler(async (req, res) => {
  const data = validate(z.object({ productId: z.string(), variantId: z.string().optional(), quantity: z.number().int().min(1).max(99) }), req.body);
  const product = await prisma.product.findFirst({ where: { id: data.productId, isActive: true }, include: { variants: { where: { id: data.variantId }, include: { inventory: true } } } });
  if (!product) throw new AppError(404, 'Product not found');
  if (data.variantId && (!product.variants[0]?.inventory || product.variants[0].inventory.quantity - product.variants[0].inventory.reserved < data.quantity)) throw new AppError(409, 'Insufficient stock');
  const cart = await prisma.cart.upsert({ where: { userId: req.auth!.userId }, create: { userId: req.auth!.userId }, update: {} });
  const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: data.productId, variantId: data.variantId ?? null } });
  const finalQuantity = (existing?.quantity ?? 0) + data.quantity;
  if (data.variantId && product.variants[0]?.inventory && product.variants[0].inventory.quantity - product.variants[0].inventory.reserved < finalQuantity) throw new AppError(409, 'Insufficient stock');
  await (existing ? prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: { increment: data.quantity } } }) : prisma.cartItem.create({ data: { ...data, variantId: data.variantId ?? null, cartId: cart.id } }));
  res.status(201).json(await prisma.cart.findUnique({ where: { id: cart.id }, include: cartInclude }));
}));
cartRouter.patch('/items/:id', asyncHandler(async (req, res) => {
  const { quantity } = validate(z.object({ quantity: z.number().int().min(1).max(99) }), req.body);
  const item = await prisma.cartItem.findFirst({ where: { id: String(req.params.id), cart: { userId: req.auth!.userId } }, include: { variant: { include: { inventory: true } } } });
  if (!item) throw new AppError(404, 'Cart item not found');
  if (item.variant && (!item.variant.inventory || item.variant.inventory.quantity - item.variant.inventory.reserved < quantity)) throw new AppError(409, 'Insufficient stock');
  res.json(await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } }));
}));
cartRouter.delete('/items/:id', asyncHandler(async (req, res) => {
  const deleted = await prisma.cartItem.deleteMany({ where: { id: String(req.params.id), cart: { userId: req.auth!.userId } } });
  if (!deleted.count) throw new AppError(404, 'Cart item not found');
  res.status(204).send();
}));
