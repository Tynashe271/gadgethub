import { Router } from 'express';
import { z } from 'zod';
import { abTestingService, presetExperiments } from '../lib/abtesting.js';
import { asyncHandler, validate } from '../lib/http.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@prisma/client';

export const abtestingRouter = Router();
abtestingRouter.use(authenticate);

/**
 * @swagger
 * /abtesting/experiments:
 *   post:
 *     summary: Create a new A/B test experiment
 *     tags: [A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - variants
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, PAUSED, COMPLETED]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               trafficAllocation:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - config
 *                     - trafficSplit
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     config:
 *                       type: object
 *                     trafficSplit:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 1
 *     responses:
 *       201:
 *         description: Experiment created successfully
 */
abtestingRouter.post(
  '/experiments',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER),
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).default('DRAFT'),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        trafficAllocation: z.number().min(0).max(1).default(1),
        variants: z.array(
          z.object({
            name: z.string().min(1),
            description: z.string(),
            config: z.record(z.string(), z.any()),
            trafficSplit: z.number().min(0).max(1),
          })
        ),
      }),
      req.body
    );

    const experiment = await abTestingService.createExperiment({
      ...data,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
    });
    res.status(201).json(experiment);
  })
);

/**
 * @swagger
 * /abtesting/experiments/{experimentId}:
 *   get:
 *     summary: Get experiment by ID
 *     tags: [A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: experimentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Experiment details
 */
abtestingRouter.get(
  '/experiments/:experimentId',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER),
  asyncHandler(async (req, res) => {
    const experimentId = req.params.experimentId as string;
    const experiment = await abTestingService.getExperiment(experimentId);
    
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    
    res.json(experiment);
  })
);

/**
 * @swagger
 * /abtesting/experiments:
 *   get:
 *     summary: Get all active experiments
 *     tags: [A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active experiments
 */
abtestingRouter.get(
  '/experiments',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER),
  asyncHandler(async (_req, res) => {
    const experiments = await abTestingService.getActiveExperiments();
    res.json(experiments);
  })
);

/**
 * @swagger
 * /abtesting/assign/{experimentId}:
 *   post:
 *     summary: Assign user to a variant
 *     tags: [A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: experimentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User assigned to variant
 */
abtestingRouter.post(
  '/assign/:experimentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const experimentId = req.params.experimentId as string;
    const variant = await abTestingService.assignVariant(
      experimentId,
      req.auth!.userId
    );
    
    if (!variant) {
      return res.json({ assigned: false, variant: null });
    }
    
    res.json({ assigned: true, variant });
  })
);

/**
 * @swagger
 * /abtesting/track:
 *   post:
 *     summary: Track conversion event
 *     tags: [A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - experimentId
 *               - variantId
 *               - eventType
 *             properties:
 *               experimentId:
 *                 type: string
 *               variantId:
 *                 type: string
 *               eventType:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Conversion tracked successfully
 */
abtestingRouter.post(
  '/track',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        experimentId: z.string(),
        variantId: z.string(),
        eventType: z.string(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
      req.body
    );

    await abTestingService.trackConversion(
      data.experimentId,
      data.variantId,
      req.auth!.userId,
      data.eventType,
      data.metadata
    );

    res.json({ success: true });
  })
);

/**
 * @swagger
 * /abtesting/results/{experimentId}:
 *   get:
 *     summary: Get experiment results
 *     tags: [A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: experimentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Experiment results
 */
abtestingRouter.get(
  '/results/:experimentId',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER),
  asyncHandler(async (req, res) => {
    const experimentId = req.params.experimentId as string;
    const results = await abTestingService.getExperimentResults(experimentId);
    res.json(results);
  })
);

/**
 * @swagger
 * /abtesting/experiments/{experimentId}/status:
 *   patch:
 *     summary: Update experiment status
 *     tags: [A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: experimentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, PAUSED, COMPLETED]
 *     responses:
 *       200:
 *         description: Experiment status updated
 */
abtestingRouter.patch(
  '/experiments/:experimentId/status',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER),
  asyncHandler(async (req, res) => {
    const data = validate(
      z.object({
        status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']),
      }),
      req.body
    );

    const experimentId = req.params.experimentId as string;
    await abTestingService.updateExperimentStatus(experimentId, data.status);
    res.json({ success: true });
  })
);

/**
 * @swagger
 * /abtesting/experiments/{experimentId}:
 *   delete:
 *     summary: Delete experiment
 *     tags: [A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: experimentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Experiment deleted
 */
abtestingRouter.delete(
  '/experiments/:experimentId',
  authenticate,
  authorize(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const experimentId = req.params.experimentId as string;
    await abTestingService.deleteExperiment(experimentId);
    res.status(204).send();
  })
);

/**
 * @swagger
 * /abtesting/presets:
 *   get:
 *     summary: Get available preset experiments
 *     tags: [A/B Testing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available preset experiments
 */
abtestingRouter.get(
  '/presets',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.STORE_MANAGER),
  asyncHandler(async (_req, res) => {
    res.json(presetExperiments);
  })
);
