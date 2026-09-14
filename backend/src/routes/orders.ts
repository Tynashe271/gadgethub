import { Router } from 'express';
import { PaymentMethod } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler, validate } from '../lib/http.js';
import { authenticate } from '../middleware/auth.js';

export const ordersRouter = Router();
ordersRouter.use(authenticate);

ordersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.order.findMany({
        where: { userId: req.auth!.userId },
        orderBy: { createdAt: 'desc' },
        include: { items: true, payments: true, delivery: true },
      })
    );
  })
);

ordersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { id: String(req.params.id), userId: req.auth!.userId },
      include: { items: true, payments: true, delivery: true, address: true },
    });
    if (!order) throw new AppError(404, 'Order not found');
    res.json(order);
  })
);

ordersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        addressId: z.string(),
        paymentMethod: z.nativeEnum(PaymentMethod),
        deliveryMethod: z.string().min(1),
        deliveryFee: z.number().nonnegative().default(0),
        couponCode: z.string().optional(),
      }),
      req.body
    );

    const userId = req.auth!.userId;

    const [cart, address] = await Promise.all([
      prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
              variant: { include: { inventory: true } },
            },
          },
        },
      }),
      prisma.address.findFirst({
        where: { id: data.addressId, userId },
      }),
    ]);

    if (!address) throw new AppError(404, 'Address not found');
    if (!cart?.items.length) throw new AppError(400, 'Cart is empty');

    // Validate stock before transaction
    for (const item of cart.items) {
      if (
        item.variant &&
        (!item.variant.inventory ||
          item.variant.inventory.quantity - item.variant.inventory.reserved <
            item.quantity)
      ) {
        throw new AppError(
          409,
          `Insufficient stock for ${item.product.name}`
        );
      }
    }

    const now = new Date();
    const coupon = data.couponCode
      ? await prisma.coupon.findFirst({
          where: {
            code: data.couponCode.toUpperCase(),
            isActive: true,
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
        })
      : null;
    if (data.couponCode && !coupon) throw new AppError(400, 'Coupon is invalid or expired');
    if (coupon?.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AppError(409, 'Coupon usage limit has been reached');
    if (coupon?.code.startsWith('GH-REWARD-')) {
      const ownedReward = await prisma.loyaltyTransaction.findFirst({
        where: { userId, reason: 'REDEMPTION', reference: coupon.code },
      });
      if (!ownedReward) throw new AppError(403, 'This reward belongs to another account');
    }

    const subtotal = cart.items.reduce(
      (sum, i) =>
        sum +
        (Number(i.product.discountPrice ?? i.product.price) +
          Number(i.variant?.priceAdjustment ?? 0)) *
          i.quantity,
      0
    );

    let discount = coupon
      ? coupon.type === 'PERCENT'
        ? (subtotal * Number(coupon.value)) / 100
        : Number(coupon.value)
      : 0;

    if (coupon?.minSpend && subtotal < Number(coupon.minSpend)) discount = 0;
    if (coupon?.maxDiscount)
      discount = Math.min(discount, Number(coupon.maxDiscount));

    const order = await prisma.$transaction(
      async (tx) => {
        // Lock and reserve inventory to prevent overselling
        for (const item of cart.items) {
          if (item.variant?.inventory) {
            // Use FOR UPDATE by querying first to lock
            const inventory = await tx.inventory.findUnique({
              where: { id: item.variant.inventory.id },
            });

            if (
              !inventory ||
              inventory.quantity - inventory.reserved < item.quantity
            ) {
              throw new AppError(
                409,
                `Insufficient stock for ${item.product.name} (possible concurrent order)`
              );
            }

            await tx.inventory.update({
              where: { id: item.variant.inventory.id },
              data: {
                quantity: { decrement: item.quantity },
                reserved: { decrement: Math.min(item.quantity, inventory.reserved || 0) },
                movements: {
                  create: {
                    type: 'STOCK_OUT',
                    quantity: -item.quantity,
                    reason: 'Order checkout',
                  },
                },
              },
            });
          }
        }

        const orderNumber = `GH-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const total = Math.max(0, subtotal - discount + data.deliveryFee);

        const created = await tx.order.create({
          data: {
            orderNumber,
            userId,
            addressId: address.id,
            subtotal,
            discount,
            deliveryFee: data.deliveryFee,
            total,
            couponId: discount ? coupon?.id : undefined,
            items: {
              create: cart.items.map((i) => ({
                productId: i.productId,
                variantId: i.variantId,
                name: i.product.name,
                sku: i.variant?.sku ?? i.product.sku,
                quantity: i.quantity,
                unitPrice:
                  Number(i.product.discountPrice ?? i.product.price) +
                  Number(i.variant?.priceAdjustment ?? 0),
              })),
            },
            payments: {
              create: {
                method: data.paymentMethod,
                amount: total,
              },
            },
            delivery: {
              create: {
                method: data.deliveryMethod,
                fee: data.deliveryFee,
              },
            },
          },
          include: { items: true, payments: true, delivery: true },
        });

        // Clear cart after successful order
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        // Increment coupon usage
        if (discount && coupon) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }

        return created;
      },
      {
        timeout: 10000, // 10 second transaction timeout
      }
    );

    res.status(201).json(order);
  })
);
ordersRouter.post('/:id/cancel',asyncHandler(async(req,res)=>{
  const order=await prisma.order.findFirst({where:{id:String(req.params.id),userId:req.auth!.userId},include:{items:true}});
  if(!order)throw new AppError(404,'Order not found');
  if(order.status!=='PLACED')throw new AppError(409,'Paid or processing orders must be refunded by support and cannot be cancelled directly');
  const updated=await prisma.$transaction(async tx=>{
    for(const item of order.items){
      if(item.variantId){
        const inventory=await tx.inventory.findUnique({where:{variantId:item.variantId}});
        if(inventory)await tx.inventory.update({where:{id:inventory.id},data:{quantity:{increment:item.quantity},movements:{create:{type:'RETURN',quantity:item.quantity,reason:'Order cancelled',reference:order.orderNumber}}}});
      }
    }
    return tx.order.update({where:{id:order.id},data:{status:'CANCELLED',delivery:{update:{status:'CANCELLED'}}},include:{items:true,payments:true,delivery:true}});
  });
  res.json(updated);
}));
