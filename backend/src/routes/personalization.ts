import { Router } from 'express';
import { z } from 'zod';
import { personalizationService } from '../lib/personalization.js';
import { asyncHandler, validate } from '../lib/http.js';
import { authenticate } from '../middleware/auth.js';

export const personalizationRouter = Router();
personalizationRouter.use(authenticate);

/**
 * @swagger
 * /personalization/recommendations:
 *   get:
 *     summary: Get personalized product recommendations
 *     tags: [Personalization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recommendations
 *     responses:
 *       200:
 *         description: Personalized recommendations
 */
personalizationRouter.get(
  '/recommendations',
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        limit: z.coerce.number().int().min(1).max(50).default(10),
      }),
      req.query
    );

    const recommendations = await personalizationService.getPersonalizedRecommendations(
      req.auth!.userId,
      params.limit
    );

    res.json(recommendations);
  })
);

/**
 * @swagger
 * /personalization/trending:
 *   get:
 *     summary: Get trending products
 *     tags: [Personalization]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of trending products
 *     responses:
 *       200:
 *         description: Trending products
 */
personalizationRouter.get(
  '/trending',
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        limit: z.coerce.number().int().min(1).max(50).default(10),
      }),
      req.query
    );

    const trending = await personalizationService.getTrendingProducts(params.limit);
    res.json(trending);
  })
);

/**
 * @swagger
 * /personalization/similar/{productId}:
 *   get:
 *     summary: Get similar products
 *     tags: [Personalization]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *     responses:
 *       200:
 *         description: Similar products
 */
personalizationRouter.get(
  '/similar/:productId',
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        limit: z.coerce.number().int().min(1).max(20).default(6),
      }),
      req.query
    );

    const similar = await personalizationService.getSimilarProducts(
      req.params.productId as string,
      params.limit
    );

    res.json(similar);
  })
);

/**
 * @swagger
 * /personalization/track:
 *   post:
 *     summary: Track user behavior for personalization
 *     tags: [Personalization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [view, search, add_to_cart, purchase, wishlist]
 *               productId:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Behavior tracked successfully
 */
personalizationRouter.post(
  '/track',
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        action: z.enum(['view', 'search', 'add_to_cart', 'purchase', 'wishlist']),
        productId: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
      req.body
    );

    await personalizationService.trackUserBehavior(
      req.auth!.userId,
      data.action,
      data.productId,
      data.metadata
    );

    res.json({ success: true });
  })
);