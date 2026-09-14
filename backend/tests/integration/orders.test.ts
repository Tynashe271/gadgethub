import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { OrderStatus, PaymentStatus, PaymentMethod, ProductCondition } from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('Orders API Integration Tests', () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let testUser: any;
  let testAddress: any;
  let testProduct: any;
  let testCategory: any;
  let testBrand: any;
  let testCart: any;

  const deleteOrders = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    const where = { orderId: { in: orderIds } };
    await prisma.payment.deleteMany({ where });
    await prisma.delivery.deleteMany({ where });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  };

  beforeAll(async () => {
    await prisma.$connect();
    
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `test-user-${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash('TestPassword123!', 12),
        firstName: 'Test',
        lastName: 'User',
        role: 'CUSTOMER',
      },
    });

    // Create test category and brand
    testCategory = await prisma.category.create({
      data: {
        name: `Order Test Category ${runId}`,
        slug: `order-test-category-${runId}`,
      },
    });

    testBrand = await prisma.brand.create({
      data: {
        name: `Order Test Brand ${runId}`,
        slug: `order-test-brand-${runId}`,
      },
    });

    // Create test product with inventory
    testProduct = await prisma.product.create({
      data: {
        name: 'Order Test Product',
        slug: `order-test-product-${Date.now()}`,
        sku: `ORDER-TEST-${Date.now()}`,
        reference: `ORDER-REF-${Date.now()}`,
        description: 'Test product for order tests',
        price: 50.00,
        condition: ProductCondition.BRAND_NEW,
        categoryId: testCategory.id,
        brandId: testBrand.id,
        variants: {
          create: {
            sku: `VARIANT-${Date.now()}`,
            inventory: {
              create: {
                quantity: 100,
                lowStockAt: 10,
              },
            },
          },
        },
      },
      include: { variants: true },
    });

    // Create test address
    testAddress = await prisma.address.create({
      data: {
        recipient: 'Test User',
        phone: '+1234567890',
        line1: '123 Test Street',
        city: 'Test City',
        country: 'Zimbabwe',
        isDefault: true,
        userId: testUser.id,
      },
    });

    // Create test cart
    testCart = await prisma.cart.create({
      data: {
        userId: testUser.id,
        items: {
          create: {
            productId: testProduct.id,
            variantId: testProduct.variants[0].id,
            quantity: 2,
          },
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.cartItem.deleteMany({ where: { cartId: testCart.id } });
    await prisma.cart.delete({ where: { id: testCart.id } });
    const orders = await prisma.order.findMany({ where: { userId: testUser.id }, select: { id: true } });
    await deleteOrders(orders.map(({ id }) => id));
    await prisma.address.delete({ where: { id: testAddress.id } });
    const inventories = await prisma.inventory.findMany({
      where: { variant: { productId: testProduct.id } },
      select: { id: true },
    });
    await prisma.stockMovement.deleteMany({
      where: { inventoryId: { in: inventories.map(({ id }) => id) } },
    });
    await prisma.product.delete({ where: { id: testProduct.id } });
    await prisma.brand.delete({ where: { id: testBrand.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  it('should create an order from cart', async () => {
    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-${Date.now()}`,
        status: OrderStatus.PLACED,
        subtotal: 100.00,
        discount: 0,
        deliveryFee: 5.00,
        total: 105.00,
        userId: testUser.id,
        addressId: testAddress.id,
        items: {
          create: {
            productId: testProduct.id,
            variantId: testProduct.variants[0].id,
            name: testProduct.name,
            sku: testProduct.variants[0].sku,
            quantity: 2,
            unitPrice: 50.00,
          },
        },
        payments: {
          create: {
            method: PaymentMethod.CASH_ON_DELIVERY,
            amount: 105.00,
            status: PaymentStatus.PENDING,
          },
        },
        delivery: {
          create: {
            method: 'Standard Delivery',
            fee: 5.00,
            status: 'PENDING',
          },
        },
      },
    });

    expect(order).toBeDefined();
    expect(order.status).toBe(OrderStatus.PLACED);
    expect(Number(order.total)).toBe(105.00);

    // Cleanup
    await deleteOrders([order.id]);
  });

  it('should handle order status transitions', async () => {
    const order = await prisma.order.create({
      data: {
        orderNumber: `STATUS-TEST-${Date.now()}`,
        status: OrderStatus.PLACED,
        subtotal: 50.00,
        total: 55.00,
        deliveryFee: 5.00,
        userId: testUser.id,
        addressId: testAddress.id,
        items: {
          create: {
            productId: testProduct.id,
            name: testProduct.name,
            sku: testProduct.sku,
            quantity: 1,
            unitPrice: 50.00,
          },
        },
        payments: {
          create: {
            method: PaymentMethod.CASH_ON_DELIVERY,
            amount: 55.00,
            status: PaymentStatus.PENDING,
          },
        },
        delivery: {
          create: {
            method: 'Standard',
            fee: 5.00,
            status: 'PENDING',
          },
        },
      },
    });

    // Update status through payment confirmation
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAYMENT_CONFIRMED,
      },
    });

    expect(updatedOrder.status).toBe(OrderStatus.PAYMENT_CONFIRMED);

    // Cleanup
    await deleteOrders([order.id]);
  });

  it('should handle inventory deduction on order', async () => {
    const initialInventory = await prisma.inventory.findUnique({
      where: { variantId: testProduct.variants[0].id },
    });

    const initialQuantity = initialInventory?.quantity || 0;

    const order = await prisma.$transaction(async (tx) => {
      // Create order and deduct inventory
      const newOrder = await tx.order.create({
        data: {
          orderNumber: `INV-TEST-${Date.now()}`,
          status: OrderStatus.PLACED,
          subtotal: 50.00,
          total: 55.00,
          deliveryFee: 5.00,
          userId: testUser.id,
          addressId: testAddress.id,
          items: {
            create: {
              productId: testProduct.id,
              variantId: testProduct.variants[0].id,
              name: testProduct.name,
              sku: testProduct.variants[0].sku,
              quantity: 1,
              unitPrice: 50.00,
            },
          },
          payments: {
            create: {
              method: PaymentMethod.CASH_ON_DELIVERY,
              amount: 55.00,
              status: PaymentStatus.PAID,
            },
          },
          delivery: {
            create: {
              method: 'Standard',
              fee: 5.00,
              status: 'PENDING',
            },
          },
        },
      });

      // Deduct inventory
      await tx.inventory.update({
        where: { variantId: testProduct.variants[0].id },
        data: {
          quantity: { decrement: 1 },
          movements: {
            create: {
              type: 'STOCK_OUT',
              quantity: -1,
              reason: 'Order test',
            },
          },
        },
      });

      return newOrder;
    });

    const finalInventory = await prisma.inventory.findUnique({
      where: { variantId: testProduct.variants[0].id },
    });

    expect(finalInventory?.quantity).toBe(initialQuantity - 1);

    // Cleanup - restore inventory
    await prisma.inventory.update({
      where: { variantId: testProduct.variants[0].id },
      data: { quantity: { increment: 1 } },
    });
    await deleteOrders([order.id]);
  });

  it('should handle order cancellation', async () => {
    const order = await prisma.order.create({
      data: {
        orderNumber: `CANCEL-TEST-${Date.now()}`,
        status: OrderStatus.PLACED,
        subtotal: 50.00,
        total: 55.00,
        deliveryFee: 5.00,
        userId: testUser.id,
        addressId: testAddress.id,
        items: {
          create: {
            productId: testProduct.id,
            name: testProduct.name,
            sku: testProduct.sku,
            quantity: 1,
            unitPrice: 50.00,
          },
        },
        payments: {
          create: {
            method: PaymentMethod.CASH_ON_DELIVERY,
            amount: 55.00,
            status: PaymentStatus.PENDING,
          },
        },
        delivery: {
          create: {
            method: 'Standard',
            fee: 5.00,
            status: 'PENDING',
          },
        },
      },
    });

    const cancelledOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        delivery: {
          update: { status: 'CANCELLED' },
        },
      },
    });

    expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED);
    expect(cancelledOrder.status).toBe('CANCELLED');

    // Cleanup
    await deleteOrders([order.id]);
  });

  it('should handle coupon application', async () => {
    const coupon = await prisma.coupon.create({
      data: {
        code: `TEST20-${runId}`,
        type: 'PERCENT',
        value: 20,
        minSpend: 50,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `COUPON-TEST-${Date.now()}`,
        status: OrderStatus.PLACED,
        subtotal: 100.00,
        discount: 20.00,
        total: 85.00,
        deliveryFee: 5.00,
        userId: testUser.id,
        addressId: testAddress.id,
        couponId: coupon.id,
        items: {
          create: {
            productId: testProduct.id,
            name: testProduct.name,
            sku: testProduct.sku,
            quantity: 2,
            unitPrice: 50.00,
          },
        },
        payments: {
          create: {
            method: PaymentMethod.CASH_ON_DELIVERY,
            amount: 85.00,
            status: PaymentStatus.PENDING,
          },
        },
        delivery: {
          create: {
            method: 'Standard',
            fee: 5.00,
            status: 'PENDING',
          },
        },
      },
    });

    expect(Number(order.discount)).toBe(20.00);
    expect(order.couponId).toBe(coupon.id);

    // Cleanup
    await deleteOrders([order.id]);
    await prisma.coupon.delete({ where: { id: coupon.id } });
  });
});
