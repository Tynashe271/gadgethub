import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  metadata?: Prisma.InputJsonValue,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { order: true },
    });
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { status, ...(metadata !== undefined ? { metadata } : {}) },
    });

    if (status === PaymentStatus.PAID && current.order.status !== 'CANCELLED') {
      await tx.order.update({
        where: { id: current.orderId },
        data: { status: 'PAYMENT_CONFIRMED' },
      });
      const points = Math.floor(Number(current.order.total));
      if (points > 0) {
        const existing = await tx.loyaltyTransaction.findUnique({
          where: {
            userId_reason_reference: {
              userId: current.order.userId,
              reason: 'ORDER_PAYMENT',
              reference: current.orderId,
            },
          },
        });
        if (!existing) {
          const user = await tx.user.update({
            where: { id: current.order.userId },
            data: { loyaltyPoints: { increment: points } },
            select: { loyaltyPoints: true },
          });
          await tx.loyaltyTransaction.create({
            data: {
              userId: current.order.userId,
              points,
              reason: 'ORDER_PAYMENT',
              reference: current.orderId,
              balance: user.loyaltyPoints,
            },
          });
        }
      }
    }
    return payment;
  });
}
