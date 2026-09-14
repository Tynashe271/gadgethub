import { prisma } from './prisma.js';
import { cache, CacheKeys } from './redis.js';
import logger from './logger.js';

export interface PersonalizedRecommendation {
  productId: string;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  image: string;
  relevanceScore: number;
  reason: string;
}

export class PersonalizationService {
  /**
   * Get personalized product recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<PersonalizedRecommendation[]> {
    const cacheKey = `recommendations:${userId}`;
    
    return cache.getOrSet(cacheKey, async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          orders: {
            include: {
              items: {
                include: {
                  product: {
                    include: {
                      category: true,
                      brand: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          wishlist: {
            include: {
              product: {
                include: {
                  category: true,
                  brand: true,
                },
              },
            },
          },
          views: {
            include: {
              product: {
                include: {
                  category: true,
                  brand: true,
                },
              },
            },
            orderBy: { viewedAt: 'desc' },
            take: 20,
          },
        },
      });

      if (!user) return [];

      // Extract user preferences
      const preferences = this.extractUserPreferences(user);
      
      // Get recommendations based on preferences
      const recommendations = await this.generateRecommendations(preferences, userId, limit);
      
      logger.info(`Generated ${recommendations.length} recommendations for user ${userId}`);
      
      return recommendations;
    }, 1800); // Cache for 30 minutes
  }

  /**
   * Extract user preferences from their behavior
   */
  private extractUserPreferences(user: any) {
    const categoryCounts = new Map<string, number>();
    const brandCounts = new Map<string, number>();
    const priceRange = { min: Infinity, max: 0 };
    const conditionPreferences = new Map<string, number>();

    // Analyze orders
    user.orders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        const product = item.product;
        
        // Count categories
        const categoryCount = categoryCounts.get(product.category.name) || 0;
        categoryCounts.set(product.category.name, categoryCount + 1);
        
        // Count brands
        const brandCount = brandCounts.get(product.brand.name) || 0;
        brandCounts.set(product.brand.name, brandCount + 1);
        
        // Track price range
        const price = Number(product.price);
        if (price < priceRange.min) priceRange.min = price;
        if (price > priceRange.max) priceRange.max = price;
        
        // Track condition preferences
        const conditionCount = conditionPreferences.get(product.condition) || 0;
        conditionPreferences.set(product.condition, conditionCount + 1);
      });
    });

    // Analyze wishlist
    user.wishlist.forEach((item: any) => {
      const product = item.product;
      
      const categoryCount = categoryCounts.get(product.category.name) || 0;
      categoryCounts.set(product.category.name, categoryCount + 1);
      
      const brandCount = brandCounts.get(product.brand.name) || 0;
      brandCounts.set(product.brand.name, brandCount + 1);
    });

    // Analyze views
    user.views.forEach((view: any) => {
      const product = view.product;
      
      const categoryCount = categoryCounts.get(product.category.name) || 0;
      categoryCounts.set(product.category.name, categoryCount + 1);
      
      const brandCount = brandCounts.get(product.brand.name) || 0;
      brandCounts.set(product.brand.name, brandCount + 1);
    });

    // Sort and get top preferences
    const topCategories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    const topBrands = Array.from(brandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    const topConditions = Array.from(conditionPreferences.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return {
      categories: topCategories,
      brands: topBrands,
      conditions: topConditions,
      priceRange: {
        min: priceRange.min === Infinity ? 0 : priceRange.min,
        max: priceRange.max === 0 ? 1000 : priceRange.max,
      },
    };
  }

  /**
   * Generate recommendations based on user preferences
   */
  private async generateRecommendations(
    preferences: any,
    userId: string,
    limit: number
  ): Promise<PersonalizedRecommendation[]> {
    const { categories, brands, conditions, priceRange } = preferences;

    // Get products that match user preferences
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          // Category-based recommendations
          ...(categories.length > 0 ? [{
            category: { name: { in: categories } },
          }] : []),
          // Brand-based recommendations
          ...(brands.length > 0 ? [{
            brand: { name: { in: brands } },
          }] : []),
          // Price range recommendations
          {
            price: {
              gte: priceRange.min * 0.8,
              lte: priceRange.max * 1.2,
            },
          },
        ],
        // Exclude products the user already interacted with
        NOT: {
          OR: [
            {
              orderItems: {
                some: {
                  order: {
                    userId,
                  },
                },
              },
            },
            {
              wishlist: {
                some: { userId },
              },
            },
          ],
        },
      },
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
      take: limit * 2, // Get more to score and rank
    });

    // Score and rank products
    const scoredProducts = products.map(product => {
      let score = 0;
      let reasons: string[] = [];

      // Category match
      if (categories.includes(product.category.name)) {
        score += 30;
        reasons.push(`Similar to ${product.category.name} products you've viewed`);
      }

      // Brand match
      if (brands.includes(product.brand.name)) {
        score += 25;
        reasons.push(`From ${product.brand.name}, a brand you like`);
      }

      // Price range match
      const price = Number(product.price);
      if (price >= priceRange.min * 0.8 && price <= priceRange.max * 1.2) {
        score += 20;
        reasons.push('Within your preferred price range');
      }

      // Condition match
      if (conditions.includes(product.condition)) {
        score += 15;
        reasons.push(`Matches your preference for ${product.condition} products`);
      }

      // Featured products bonus
      if (product.featured) {
        score += 10;
        reasons.push('Featured product');
      }

      // View count popularity bonus
      if (product.viewCount > 50) {
        score += Math.min(product.viewCount / 10, 10);
        reasons.push('Popular product');
      }

      return {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price),
        discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
        image: product.images[0]?.url || '',
        relevanceScore: score,
        reason: reasons[0] || 'Recommended for you',
      };
    });

    // Sort by relevance score and return top results
    return scoredProducts
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Track user behavior for personalization
   */
  async trackUserBehavior(
    userId: string,
    action: 'view' | 'search' | 'add_to_cart' | 'purchase' | 'wishlist',
    productId?: string,
    metadata?: any
  ): Promise<void> {
    const behaviorData = {
      userId,
      action,
      productId,
      metadata,
      timestamp: new Date(),
    };

    // Store in database for long-term analysis
    // This would require a UserBehavior table in the schema
    // For now, we'll use the existing tracking mechanisms
    
    logger.info(`User behavior tracked: ${userId} - ${action} - ${productId}`);
  }

  /**
   * Get trending products based on overall user activity
   */
  async getTrendingProducts(limit: number = 10): Promise<PersonalizedRecommendation[]> {
    const cacheKey = 'trending:products';
    
    return cache.getOrSet(cacheKey, async () => {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          viewCount: { gt: 10 },
        },
        include: {
          category: true,
          brand: true,
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
          _count: {
            select: {
              orderItems: true,
              reviews: true,
            },
          },
        },
        orderBy: [
          { viewCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      return products.map(product => ({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price),
        discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
        image: (product as any).images?.[0]?.url || '',
        relevanceScore: product.viewCount + ((product as any)._count?.orderItems || 0) * 5,
        reason: 'Trending product',
      }));
    }, 3600); // Cache for 1 hour
  }

  /**
   * Get similar products based on product attributes
   */
  async getSimilarProducts(productId: string, limit: number = 6): Promise<PersonalizedRecommendation[]> {
    const cacheKey = `similar:${productId}`;
    
    return cache.getOrSet(cacheKey, async () => {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          brand: true,
        },
      });

      if (!product) return [];

      const similarProducts = await prisma.product.findMany({
        where: {
          id: { not: productId },
          isActive: true,
          OR: [
            { categoryId: product.categoryId },
            { brandId: product.brandId },
            {
              AND: [
                { price: { gte: Number(product.price) * 0.7 } },
                { price: { lte: Number(product.price) * 1.3 } },
              ],
            },
          ],
        },
        include: {
          category: true,
          brand: true,
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
        take: limit,
      });

      return similarProducts.map(p => {
        let score = 0;
        let reason = '';

        if (p.categoryId === product.categoryId) {
          score += 40;
          reason = 'Same category';
        }
        if (p.brandId === product.brandId) {
          score += 30;
          reason = 'Same brand';
        }
        const priceDiff = Math.abs(Number(p.price) - Number(product.price)) / Number(product.price);
        if (priceDiff < 0.3) {
          score += 20;
          reason = 'Similar price';
        }

        return {
          productId: p.id,
          name: p.name,
          slug: p.slug,
          price: Number(p.price),
          discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
          image: p.images[0]?.url || '',
          relevanceScore: score,
          reason: reason || 'Similar product',
        };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }, 1800); // Cache for 30 minutes
  }
}

export const personalizationService = new PersonalizationService();