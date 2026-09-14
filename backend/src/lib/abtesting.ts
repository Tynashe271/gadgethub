import { prisma } from './prisma.js';
import { cache } from './redis.js';
import logger from './logger.js';
import { randomUUID } from 'node:crypto';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startDate: Date | null;
  endDate: Date | null;
  trafficAllocation: number; // 0-1, percentage of traffic
  variants: Variant[];
  targetAudience?: {
    userRoles?: string[];
    userSegments?: string[];
  };
}

export interface Variant {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
  trafficSplit: number; // 0-1, percentage of experiment traffic
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  userId: string;
  assignedAt: Date;
}

export interface ConversionEvent {
  id: string;
  experimentId: string;
  variantId: string;
  userId: string;
  eventType: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class ABTestingService {
  /**
   * Create a new A/B test experiment
   */
  async createExperiment(experiment: Omit<Experiment, 'id' | 'variants'> & { variants: Omit<Variant, 'id'>[] }): Promise<Experiment> {
    const id = randomUUID();
    
    // Validate traffic allocation
    const totalTrafficSplit = experiment.variants.reduce((sum, v) => sum + v.trafficSplit, 0);
    if (Math.abs(totalTrafficSplit - 1) > 0.01) {
      throw new Error('Variant traffic splits must sum to 1.0');
    }

    // In a real implementation, this would be stored in the database
    // For now, we'll use a simplified in-memory approach with cache
    const newExperiment: Experiment = {
      id,
      ...experiment,
      variants: experiment.variants.map(v => ({
        ...v,
        id: randomUUID(),
      })),
    };

    await cache.set(`experiment:${id}`, newExperiment, 86400 * 30); // 30 days
    
    logger.info(`Created A/B test experiment: ${id} - ${experiment.name}`);
    
    return newExperiment;
  }

  /**
   * Get experiment by ID
   */
  async getExperiment(experimentId: string): Promise<Experiment | null> {
    return cache.get(`experiment:${experimentId}`);
  }

  /**
   * Get all active experiments
   */
  async getActiveExperiments(): Promise<Experiment[]> {
    // In a real implementation, this would query the database
    // For now, return empty array
    return [];
  }

  /**
   * Assign user to a variant for an experiment
   */
  async assignVariant(experimentId: string, userId: string): Promise<Variant | null> {
    const experiment = await this.getExperiment(experimentId);
    
    if (!experiment || experiment.status !== 'ACTIVE') {
      return null;
    }

    // Check if user is already assigned
    const assignmentKey = `assignment:${experimentId}:${userId}`;
    const existingAssignment = await cache.get<ExperimentAssignment>(assignmentKey);
    
    if (existingAssignment) {
      const variant = experiment.variants.find(v => v.id === existingAssignment.variantId);
      return variant || null;
    }

    // Check if user should be included in experiment (traffic allocation)
    const userHash = this.hashUserId(userId);
    const shouldInclude = userHash % 100 < (experiment.trafficAllocation * 100);
    
    if (!shouldInclude) {
      return null;
    }

    // Assign to variant based on traffic split
    const variant = this.selectVariant(experiment.variants, userHash);
    
    if (variant) {
      const assignment: ExperimentAssignment = {
        experimentId,
        variantId: variant.id,
        userId,
        assignedAt: new Date(),
      };
      
      await cache.set(assignmentKey, assignment, 86400 * 30); // 30 days
      
      logger.info(`Assigned user ${userId} to variant ${variant.id} in experiment ${experimentId}`);
    }

    return variant || null;
  }

  /**
   * Track conversion event
   */
  async trackConversion(
    experimentId: string,
    variantId: string,
    userId: string,
    eventType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const conversion: ConversionEvent = {
      id: randomUUID(),
      experimentId,
      variantId,
      userId,
      eventType,
      metadata,
      timestamp: new Date(),
    };

    // Store conversion (in real implementation, this would go to database)
    const conversionKey = `conversions:${experimentId}:${variantId}:${eventType}`;
    await cache.set(conversionKey, conversion, 86400 * 30);
    
    logger.info(`Tracked conversion: ${eventType} for user ${userId} in variant ${variantId}`);
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(experimentId: string): Promise<{
    experiment: Experiment;
    variants: Array<{
      variant: Variant;
      participants: number;
      conversions: number;
      conversionRate: number;
    }>;
    winner?: string;
    significance?: number;
  }> {
    const experiment = await this.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error('Experiment not found');
    }

    // In a real implementation, this would query the database for actual metrics
    // For now, return placeholder data
    const results = experiment.variants.map(variant => ({
      variant,
      participants: Math.floor(Math.random() * 1000) + 100,
      conversions: Math.floor(Math.random() * 100) + 10,
      conversionRate: 0,
    }));

    // Calculate conversion rates
    results.forEach(result => {
      result.conversionRate = result.participants > 0 
        ? (result.conversions / result.participants) * 100 
        : 0;
    });

    // Determine winner (highest conversion rate)
    const winner = results.reduce((best, current) => 
      current.conversionRate > best.conversionRate ? current : best
    );

    return {
      experiment,
      variants: results,
      winner: winner.variant.id,
      significance: 0.95, // Placeholder
    };
  }

  /**
   * Hash user ID for consistent assignment
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Select variant based on traffic split and user hash
   */
  private selectVariant(variants: Variant[], userHash: number): Variant | null {
    let cumulative = 0;
    const hashValue = (userHash % 100) / 100; // Normalize to 0-1
    
    for (const variant of variants) {
      cumulative += variant.trafficSplit;
      if (hashValue < cumulative) {
        return variant;
      }
    }
    
    return variants[variants.length - 1] || null;
  }

  /**
   * Update experiment status
   */
  async updateExperimentStatus(
    experimentId: string,
    status: Experiment['status']
  ): Promise<void> {
    const experiment = await this.getExperiment(experimentId);
    
    if (!experiment) {
      throw new Error('Experiment not found');
    }

    experiment.status = status;
    await cache.set(`experiment:${experimentId}`, experiment, 86400 * 30);
    
    logger.info(`Updated experiment ${experimentId} status to ${status}`);
  }

  /**
   * Delete experiment
   */
  async deleteExperiment(experimentId: string): Promise<void> {
    await cache.del(`experiment:${experimentId}`);
    
    // Clean up related data
    // In real implementation, this would clean up database records
    
    logger.info(`Deleted experiment ${experimentId}`);
  }
}

export const abTestingService = new ABTestingService();

// Pre-configured experiments for common use cases
export const presetExperiments = {
  homepageLayout: {
    name: 'Homepage Layout Test',
    description: 'Test different homepage layouts for better conversion',
    variants: [
      {
        name: 'Control',
        description: 'Current homepage layout',
        config: { layout: 'current' },
        trafficSplit: 0.5,
      },
      {
        name: 'Variant A',
        description: 'New grid layout',
        config: { layout: 'grid' },
        trafficSplit: 0.25,
      },
      {
        name: 'Variant B',
        description: 'List layout with larger images',
        config: { layout: 'list' },
        trafficSplit: 0.25,
      },
    ],
    trafficAllocation: 1.0,
  },

  checkoutFlow: {
    name: 'Checkout Flow Optimization',
    description: 'Test different checkout flows for reduced abandonment',
    variants: [
      {
        name: 'Control',
        description: 'Current checkout process',
        config: { flow: 'current' },
        trafficSplit: 0.5,
      },
      {
        name: 'Simplified',
        description: 'One-page checkout',
        config: { flow: 'one-page' },
        trafficSplit: 0.5,
      },
    ],
    trafficAllocation: 0.5, // Only test with 50% of traffic
  },

  pricingDisplay: {
    name: 'Pricing Display Test',
    description: 'Test different ways to display pricing and discounts',
    variants: [
      {
        name: 'Control',
        description: 'Current pricing display',
        config: { display: 'current' },
        trafficSplit: 0.33,
      },
      {
        name: 'Emphasized Savings',
        description: 'Highlight savings more prominently',
        config: { display: 'savings-focused' },
        trafficSplit: 0.33,
      },
      {
        name: 'Minimalist',
        description: 'Clean, minimal pricing display',
        config: { display: 'minimal' },
        trafficSplit: 0.34,
      },
    ],
    trafficAllocation: 0.8,
  },
};