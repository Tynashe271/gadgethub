import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, validate, AppError } from '../lib/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@prisma/client';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);

/**
 * @swagger
 * /analytics/overview:
 *   get:
 *     summary: Get analytics overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics period
 *     responses:
 *       200:
 *         description: Analytics overview data
 */
analyticsRouter.get(
  '/overview',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER),
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }),
      req.query
    );

    const startDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = params.endDate || new Date();

    const [
      totalRevenue,
      totalOrders,
      totalUsers,
      activeUsers,
      topProducts,
      recentOrders,
      orderStatusBreakdown,
      paymentMethodBreakdown,
    ] = await Promise.all([
      // Total revenue
      prisma.payment.aggregate({
        where: {
          status: 'PAID',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),

      // Total orders
      prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Total users
      prisma.user.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Active users (users with orders in period)
      prisma.user.count({
        where: {
          orders: {
            some: {
              createdAt: { gte: startDate, lte: endDate },
            },
          },
        },
      }),

      // Top products by sales
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            createdAt: { gte: startDate, lte: endDate },
          },
        },
        _sum: { quantity: true },
        orderBy: {
          _sum: { quantity: 'desc' },
        },
        take: 10,
      }),

      // Recent orders
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),

      // Order status breakdown
      prisma.order.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),

      // Payment method breakdown
      prisma.payment.groupBy({
        by: ['method'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Get product details for top products
    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, slug: true, price: true },
    });

    const topProductsWithDetails = topProducts.map(tp => ({
      ...tp,
      product: productDetails.find(p => p.id === tp.productId),
    }));

    res.json({
      period: { startDate, endDate },
      revenue: {
        total: Number(totalRevenue._sum.amount || 0),
        orders: totalOrders,
        averageOrderValue: totalOrders > 0 ? Number(totalRevenue._sum.amount || 0) / totalOrders : 0,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        conversionRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
      },
      topProducts: topProductsWithDetails,
      recentOrders,
      orderStatusBreakdown,
      paymentMethodBreakdown,
    });
  })
);

/**
 * @swagger
 * /analytics/products:
 *   get:
 *     summary: Get product analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
analyticsRouter.get(
  '/products',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER, Role.PRODUCT),
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
      req.query
    );

    const startDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = params.endDate || new Date();

    const [productStats, lowStock, outOfStock] = await Promise.all([
      // Product sales statistics
      prisma.product.findMany({
        take: params.limit,
        include: {
          _count: {
            select: {
              orderItems: true,
              reviews: true,
              views: true,
            },
          },
          orderItems: {
            where: {
              order: {
                createdAt: { gte: startDate, lte: endDate },
              },
            },
          },
        },
        orderBy: {
          viewCount: 'desc',
        },
      }),

      // Low stock products
      prisma.product.findMany({
        where: {
          variants: {
            some: {
              inventory: {
                quantity: { lte: prisma.inventory.fields.lowStockAt },
              },
            },
          },
        },
        include: {
          variants: {
            include: {
              inventory: true,
            },
          },
        },
        take: 20,
      }),

      // Out of stock products
      prisma.product.findMany({
        where: {
          variants: {
            some: {
              inventory: {
                quantity: 0,
              },
            },
          },
        },
        include: {
          variants: {
            include: {
              inventory: true,
            },
          },
        },
        take: 20,
      }),
    ]);

    const productAnalytics = productStats.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      viewCount: product.viewCount,
      totalSales: (product as any).orderItems?.reduce((sum: number, item: any) => sum + (item._sum?.quantity || 0), 0) || 0,
      totalReviews: (product as any)._count?.reviews || 0,
      totalViews: (product as any)._count?.views || 0,
    }));

    res.json({
      productAnalytics,
      lowStock,
      outOfStock,
    });
  })
);

/**
 * @swagger
 * /analytics/users:
 *   get:
 *     summary: Get user analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
analyticsRouter.get(
  '/users',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER),
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }),
      req.query
    );

    const startDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = params.endDate || new Date();

    const [
      userGrowth,
      userActivity,
      topCustomers,
      loyaltyDistribution,
    ] = await Promise.all([
      // User growth over time
      prisma.user.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
        orderBy: { createdAt: 'asc' },
      }),

      // User activity
      prisma.user.findMany({
        where: {
          orders: {
            some: {
              createdAt: { gte: startDate, lte: endDate },
            },
          },
        },
        include: {
          _count: {
            select: {
              orders: true,
              reviews: true,
              wishlist: true,
            },
          },
        },
        take: 20,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      // Top customers by spend
      prisma.user.findMany({
        include: {
          orders: {
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
            include: {
              payments: true,
            },
          },
        },
        take: 10,
      }),

      // Loyalty points distribution
      prisma.user.findMany({
        select: {
          loyaltyPoints: true,
        },
      }),
    ]);

    // Calculate top customers by total spend
    const customersWithSpend = topCustomers.map(user => ({
      ...user,
      totalSpend: user.orders.reduce(
        (sum, order) => sum + Number(order.payments[0]?.amount || 0),
        0
      ),
    })).sort((a, b) => b.totalSpend - a.totalSpend);

    // Calculate loyalty distribution
    const loyaltyRanges = {
      bronze: 0,
      silver: 0,
      gold: 0,
    };

    loyaltyDistribution.forEach(user => {
      if (user.loyaltyPoints >= 5000) loyaltyRanges.gold++;
      else if (user.loyaltyPoints >= 1000) loyaltyRanges.silver++;
      else loyaltyRanges.bronze++;
    });

    res.json({
      userGrowth,
      userActivity,
      topCustomers: customersWithSpend,
      loyaltyDistribution: loyaltyRanges,
    });
  })
);

/**
 * @swagger
 * /analytics/sales:
 *   get:
 *     summary: Get sales analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
analyticsRouter.get(
  '/sales',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER, Role.ORDER),
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        groupBy: z.enum(['day', 'week', 'month']).default('day'),
      }),
      req.query
    );

    const startDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = params.endDate || new Date();

    const salesData = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        payments: true,
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group sales by specified period
    const groupedSales = salesData.reduce((acc, order) => {
      const date = new Date(order.createdAt);
      let key: string;

      if (params.groupBy === 'day') {
        key = date.toISOString().slice(0, 10);
      } else if (params.groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!acc[key]) {
        acc[key] = {
          date: key,
          orders: 0,
          revenue: 0,
          items: 0,
        };
      }

      acc[key].orders++;
      acc[key].revenue += Number((order as any).payments?.[0]?.amount || 0);
      acc[key].items += (order as any).items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

      return acc;
    }, {} as Record<string, any>);

    res.json({
      salesData: Object.values(groupedSales),
      summary: {
        totalRevenue: salesData.reduce((sum, order) => sum + Number(order.payments[0]?.amount || 0), 0),
        totalOrders: salesData.length,
        totalItems: salesData.reduce((sum, order) => sum + order.items.reduce((s, i) => s + i.quantity, 0), 0),
        averageOrderValue: salesData.length > 0 
          ? salesData.reduce((sum, order) => sum + Number(order.payments[0]?.amount || 0), 0) / salesData.length 
          : 0,
      },
    });
  })
);
