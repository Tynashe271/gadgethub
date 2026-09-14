import { Router } from 'express';
import { z } from 'zod';
import { searchService } from '../lib/search.js';
import { asyncHandler, validate } from '../lib/http.js';

export const searchRouter = Router();

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Advanced product search with relevance scoring
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
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
 *         name: condition
 *         schema:
 *           type: string
 *         description: Filter by product condition
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
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       description:
 *                         type: string
 *                       price:
 *                         type: number
 *                       discountPrice:
 *                         type: number
 *                         nullable: true
 *                       condition:
 *                         type: string
 *                       brand:
 *                         type: object
 *                       category:
 *                         type: object
 *                       images:
 *                         type: array
 *                       relevanceScore:
 *                         type: number
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 pages:
 *                   type: integer
 */
searchRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        query: z.string().min(1).max(255),
        category: z.string().optional(),
        brand: z.string().optional(),
        minPrice: z.coerce.number().nonnegative().optional(),
        maxPrice: z.coerce.number().nonnegative().optional(),
        condition: z.string().optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
      req.query
    );

    const results = await searchService.searchProducts(params);
    res.json(results);
  })
);

/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for suggestions
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of suggestions
 *     responses:
 *       200:
 *         description: Search suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
searchRouter.get(
  '/suggestions',
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        query: z.string().min(1).max(255),
        limit: z.coerce.number().int().min(1).max(20).default(5),
      }),
      req.query
    );

    const suggestions = await searchService.getSearchSuggestions(params.query, params.limit);
    res.json(suggestions);
  })
);

/**
 * @swagger
 * /search/popular:
 *   get:
 *     summary: Get popular search terms
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of popular terms
 *     responses:
 *       200:
 *         description: Popular search terms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   term:
 *                     type: string
 *                   count:
 *                     type: integer
 */
searchRouter.get(
  '/popular',
  asyncHandler(async (req, res) => {
    const params = validate(
      z.object({
        limit: z.coerce.number().int().min(1).max(50).default(10),
      }),
      req.query
    );

    const popularTerms = await searchService.getPopularSearchTerms(params.limit);
    res.json(popularTerms);
  })
);