import { Router } from 'express';
import { ProductCondition, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler, validate } from '../lib/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { cache, CacheKeys } from '../lib/redis.js';

export const productsRouter = Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get products with filtering and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product name and description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category slug
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand slug
 *       - in: query
 *         name: condition
 *         schema:
 *           type: string
 *           enum: [BRAND_NEW, EXCELLENT, GOOD, REFURBISHED]
 *         description: Filter by product condition
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, price_asc, price_desc, popular]
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = validate(
      z.object({
        search: z.string().max(255).optional(),
        category: z.string().optional(),
        brand: z.string().optional(),
        condition: z.nativeEnum(ProductCondition).optional(),
        minPrice: z.coerce.number().nonnegative().optional(),
        maxPrice: z.coerce.number().nonnegative().optional(),
        sort: z
          .enum(['newest', 'price_asc', 'price_desc', 'popular'])
          .default('newest'),
        page: z.coerce
          .number()
          .int()
          .positive()
          .default(1)
          .pipe(z.number().max(10000)),
        limit: z.coerce
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20),
      }),
      req.query
    );

    // Validate price range
    if (
      q.minPrice !== undefined &&
      q.maxPrice !== undefined &&
      q.minPrice > q.maxPrice
    ) {
      throw new AppError(400, 'minPrice cannot be greater than maxPrice');
    }

    const cacheKey = CacheKeys.products(JSON.stringify(q));
    
    const result = await cache.getOrSet(cacheKey, async () => {
      const where = {
        isActive: true,
        ...(q.search && {
          OR: [
            { name: { contains: q.search, mode: 'insensitive' as const } },
            {
              description: { contains: q.search, mode: 'insensitive' as const },
            },
          ],
        }),
        ...(q.category && { category: { slug: q.category } }),
        ...(q.brand && { brand: { slug: q.brand } }),
        ...(q.condition && { condition: q.condition }),
        ...((q.minPrice !== undefined || q.maxPrice !== undefined) && {
          price: {
            ...(q.minPrice !== undefined && { gte: q.minPrice }),
            ...(q.maxPrice !== undefined && { lte: q.maxPrice }),
          },
        }),
      };

      const orderBy =
        q.sort === 'price_asc'
          ? { price: 'asc' as const }
          : q.sort === 'price_desc'
            ? { price: 'desc' as const }
            : q.sort === 'popular'
              ? { viewCount: 'desc' as const }
              : { createdAt: 'desc' as const };

      const [items, total] = await prisma.$transaction([
        prisma.product.findMany({
          where,
          orderBy,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: {
            brand: true,
            category: true,
            images: { orderBy: { sortOrder: 'asc' } },
            specifications: true,
            variants: { include: { inventory: true } },
            reviews: {
              where: { approved: true },
              select: { rating: true },
            },
          },
        }),
        prisma.product.count({ where }),
      ]);

      return {
        items,
        pagination: {
          page: q.page,
          limit: q.limit,
          total,
          pages: Math.ceil(total / q.limit),
        },
      };
    }, 600); // Cache for 10 minutes

    res.json(result);
  })
);

productsRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug);
    const cacheKey = CacheKeys.productSlug(slug);
    
    const product = await cache.getOrSet(cacheKey, async () => {
      const result = await prisma.product
        .update({
          where: { slug },
          data: { viewCount: { increment: 1 } },
          include: {
            brand: true,
            category: true,
            images: { orderBy: { sortOrder: 'asc' } },
            specifications: true,
            variants: { include: { inventory: true } },
            reviews: {
              where: { approved: true },
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        })
        .catch(() => null);

      if (!result?.isActive) throw new AppError(404, 'Product not found');
      return result;
    }, 1800); // Cache for 30 minutes

    res.json(product);
  })
);

const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  sku: z.string().min(1),
  reference: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  discountPrice: z.number().positive().nullable().optional(),
  condition: z.nativeEnum(ProductCondition),
  conditionNotes: z.string().optional(),
  warrantyMonths: z.number().int().nonnegative().default(0),
  categoryId: z.string(),
  brandId: z.string(),
  featured: z.boolean().default(false),
});

productsRouter.post(
  '/',
  authenticate,
  authorize(Role.PRODUCT, Role.STORE_MANAGER, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.create({
      data: validate(productSchema, req.body),
    });
    
    // Invalidate product caches
    await cache.invalidatePattern('products:*');
    await cache.invalidate(CacheKeys.categories());
    await cache.invalidate(CacheKeys.brands());
    
    res.status(201).json(product);
  })
);

productsRouter.patch(
  '/:id',
  authenticate,
  authorize(Role.PRODUCT, Role.STORE_MANAGER, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.update({
      where: { id: String(req.params.id) },
      data: validate(productSchema.partial(), req.body),
    });
    
    // Invalidate product caches
    await cache.invalidatePattern('products:*');
    await cache.invalidate(CacheKeys.product(product.id));
    await cache.invalidate(CacheKeys.productSlug(product.slug));
    
    res.json(product);
  })
);

productsRouter.delete(
  '/:id',
  authenticate,
  authorize(Role.PRODUCT, Role.STORE_MANAGER, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.update({
      where: { id: String(req.params.id) },
      data: { isActive: false },
    });
    
    // Invalidate product caches
    await cache.invalidatePattern('products:*');
    await cache.invalidate(CacheKeys.product(product.id));
    await cache.invalidate(CacheKeys.productSlug(product.slug));
    
    res.status(204).send();
  })
);
