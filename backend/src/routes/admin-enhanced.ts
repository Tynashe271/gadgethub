import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, validate, AppError } from '../lib/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@prisma/client';

export const adminEnhancedRouter = Router();
adminEnhancedRouter.use(authenticate);

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get enhanced admin dashboard data
 *     tags: [Admin Enhanced]
 *     security:
 *       - bearerAuth: []
 */
adminEnhancedRouter.get(
  '/dashboard',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER),
  asyncHandler(async (req, res) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayRevenue,
      weekRevenue,
      monthRevenue,
      todayOrders,
      weekOrders,
      monthOrders,
      todayUsers,
      weekUsers,
      monthUsers,
      activeUsers,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      pendingOrders,
      processingOrders,
      recentOrders,
      topSellingProducts,
      recentUsers,
      supportTickets,
      openTickets,
      inventoryAlerts,
    ] = await Promise.all([
      // Revenue metrics
      prisma.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: thisWeek } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: thisMonth } },
        _sum: { amount: true },
      }),

      // Order metrics
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.order.count({ where: { createdAt: { gte: thisMonth } } }),

      // User metrics
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.user.count({
        where: {
          orders: {
            some: {
              createdAt: { gte: thisWeek },
            },
          },
        },
      }),

      // Product metrics
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({
        where: {
          variants: {
            some: {
              inventory: {
                quantity: { lte: prisma.inventory.fields.lowStockAt },
              },
            },
          },
        },
      }),
      prisma.product.count({
        where: {
          variants: {
            some: {
              inventory: { quantity: 0 },
            },
          },
        },
      }),

      // Order status metrics
      prisma.order.count({ where: { status: 'PLACED' } }),
      prisma.order.count({ where: { status: 'PAYMENT_CONFIRMED' } }),

      // Recent activity
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          payments: true,
        },
      }),

      // Top selling products
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),

      // Recent users
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          isActive: true,
        },
      }),

      // Support tickets
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),

      // Inventory alerts
      prisma.inventory.findMany({
        where: {
          OR: [
            { quantity: { lte: prisma.inventory.fields.lowStockAt } },
            { quantity: 0 },
          ],
        },
        include: {
          variant: {
            include: {
              product: {
                select: { name: true, sku: true },
              },
            },
          },
        },
        take: 20,
      }),
    ]);

    // Get product details for top selling
    const topProductIds = topSellingProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, slug: true, price: true },
    });

    const topProductsWithDetails = topSellingProducts.map(tp => ({
      ...tp,
      product: productDetails.find(p => p.id === tp.productId),
    }));

    res.json({
      revenue: {
        today: Number(todayRevenue._sum.amount || 0),
        week: Number(weekRevenue._sum.amount || 0),
        month: Number(monthRevenue._sum.amount || 0),
      },
      orders: {
        today: todayOrders,
        week: weekOrders,
        month: monthOrders,
        pending: pendingOrders,
        processing: processingOrders,
      },
      users: {
        today: todayUsers,
        week: weekUsers,
        month: monthUsers,
        active: activeUsers,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
      },
      support: {
        total: supportTickets,
        open: openTickets,
      },
      recentActivity: {
        orders: recentOrders,
        users: recentUsers,
      },
      topSellingProducts: topProductsWithDetails,
      inventoryAlerts,
    });
  })
);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users with filtering and pagination
 *     tags: [Admin Enhanced]
 *     security:
 *       - bearerAuth: []
 */
adminEnhancedRouter.get(
  '/users',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER),
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        search: z.string().optional(),
        role: z.nativeEnum(Role).optional(),
        isActive: z.boolean().optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
      req.query
    );

    const where: any = {};
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.role) {
      where.role = params.role;
    }
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          loyaltyPoints: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        pages: Math.ceil(total / params.limit),
      },
    });
  })
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   patch:
 *     summary: Update user details
 *     tags: [Admin Enhanced]
 *     security:
 *       - bearerAuth: []
 */
adminEnhancedRouter.patch(
  '/users/:userId',
  authenticate,
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        role: z.nativeEnum(Role).optional(),
        isActive: z.boolean().optional(),
        loyaltyPoints: z.number().int().optional(),
      }),
      req.body
    );

    const user = await prisma.user.update({
      where: { id: req.params.userId as string },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        loyaltyPoints: true,
      },
    });

    res.json(user);
  })
);

/**
 * @swagger
 * /admin/inventory:
 *   get:
 *     summary: Get inventory overview
 *     tags: [Admin Enhanced]
 *     security:
 *       - bearerAuth: []
 */
adminEnhancedRouter.get(
  '/inventory',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER, Role.INVENTORY),
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        lowStock: z.boolean().optional(),
        outOfStock: z.boolean().optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
      req.query
    );

    const where: any = {};
    if (params.lowStock) {
      where.quantity = { lte: prisma.inventory.fields.lowStockAt };
    }
    if (params.outOfStock) {
      where.quantity = 0;
    }

    const [inventory, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          variant: {
            include: {
              product: {
                select: { name: true, sku: true, slug: true },
              },
            },
          },
        },
        orderBy: { quantity: 'asc' },
      }),
      prisma.inventory.count({ where }),
    ]);

    res.json({
      inventory,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        pages: Math.ceil(total / params.limit),
      },
    });
  })
);

/**
 * @swagger
 * /admin/reports/sales:
 *   get:
 *     summary: Generate sales report
 *     tags: [Admin Enhanced]
 *     security:
 *       - bearerAuth: []
 */
adminEnhancedRouter.get(
  '/reports/sales',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER),
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

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        payments: true,
        items: {
          include: {
            product: {
              select: { name: true, price: true, category: true },
            },
          },
        },
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group sales by specified period
    const groupedSales = orders.reduce((acc, order) => {
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
          uniqueCustomers: new Set(),
        };
      }

      acc[key].orders++;
      acc[key].revenue += Number((order as any).payments?.[0]?.amount || 0);
      acc[key].items += (order as any).items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
      acc[key].uniqueCustomers.add(order.userId);

      return acc;
    }, {} as Record<string, any>);

    const salesData = Object.values(groupedSales).map((data: any) => ({
      ...data,
      uniqueCustomers: data.uniqueCustomers.size,
    }));

    // Category breakdown
    const categoryBreakdown = orders.reduce((acc, order) => {
      order.items.forEach(item => {
        const category = (item.product as any).category?.name || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = { items: 0, revenue: 0 };
        }
        acc[category].items += item.quantity;
        acc[category].revenue += Number(item.product.price) * item.quantity;
      });
      return acc;
    }, {} as Record<string, any>);

    res.json({
      period: { startDate, endDate },
      salesData,
      summary: {
        totalRevenue: orders.reduce((sum, order) => sum + Number((order as any).payments?.[0]?.amount || 0), 0),
        totalOrders: orders.length,
        totalItems: orders.reduce((sum, order) => sum + ((order as any).items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0), 0),
        uniqueCustomers: new Set(orders.map(o => o.userId)).size,
        averageOrderValue: orders.length > 0 
          ? orders.reduce((sum, order) => sum + Number((order as any).payments?.[0]?.amount || 0), 0) / orders.length 
          : 0,
      },
      categoryBreakdown,
    });
  })
);
