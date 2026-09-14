import { prisma } from './prisma.js';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1).max(255),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  condition: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number | null;
  condition: string;
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  images: Array<{
    url: string;
    sortOrder: number;
  }>;
  relevanceScore: number;
}

export class SearchService {
  /**
   * Advanced product search with relevance scoring
   */
  async searchProducts(params: z.infer<typeof searchSchema>): Promise<{
    results: SearchResult[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const validated = searchSchema.parse(params);

    // Build the search query with PostgreSQL full-text search
    const searchTerms = validated.query.split(/\s+/).filter(term => term.length > 2);
    
    if (searchTerms.length === 0) {
      return {
        results: [],
        total: 0,
        page: validated.page,
        limit: validated.limit,
        pages: 0,
      };
    }

    // Create a relevance-based search query
    const whereClause: any = {
      isActive: true,
      ...(validated.category && { category: { slug: validated.category } }),
      ...(validated.brand && { brand: { slug: validated.brand } }),
      ...(validated.condition && { condition: validated.condition as any }),
      ...((validated.minPrice !== undefined || validated.maxPrice !== undefined) && {
        price: {
          ...(validated.minPrice !== undefined && { gte: validated.minPrice }),
          ...(validated.maxPrice !== undefined && { lte: validated.maxPrice }),
        },
      }),
      OR: searchTerms.map(term => ({
        OR: [
          { name: { contains: term, mode: 'insensitive' as const } },
          { description: { contains: term, mode: 'insensitive' as const } },
          { brand: { name: { contains: term, mode: 'insensitive' as const } } },
          { category: { name: { contains: term, mode: 'insensitive' as const } } },
        ],
      })),
    };

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where: whereClause,
        skip: (validated.page - 1) * validated.limit,
        take: validated.limit,
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            select: {
              url: true,
              sortOrder: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    // Calculate relevance scores
    const resultsWithRelevance = products.map(product => {
      const relevanceScore = this.calculateRelevanceScore(
        validated.query,
        product.name,
        product.description,
        (product as any).brand?.name || '',
        (product as any).category?.name || ''
      );

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: Number(product.price),
        discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
        condition: product.condition,
        brand: (product as any).brand,
        category: (product as any).category,
        images: (product as any).images,
        relevanceScore,
      };
    });

    // Sort by relevance score
    resultsWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      results: resultsWithRelevance,
      total,
      page: validated.page,
      limit: validated.limit,
      pages: Math.ceil(total / validated.limit),
    };
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(
    query: string,
    name: string,
    description: string,
    brandName: string,
    categoryName: string
  ): number {
    const terms = query.toLowerCase().split(/\s+/);
    let score = 0;

    const lowerName = name.toLowerCase();
    const lowerDescription = description.toLowerCase();
    const lowerBrand = brandName.toLowerCase();
    const lowerCategory = categoryName.toLowerCase();

    for (const term of terms) {
      // Exact match in name gets highest score
      if (lowerName === term) {
        score += 100;
      }
      // Name contains term
      else if (lowerName.includes(term)) {
        score += 50;
      }
      // Brand match
      else if (lowerBrand.includes(term)) {
        score += 30;
      }
      // Category match
      else if (lowerCategory.includes(term)) {
        score += 25;
      }
      // Description match
      else if (lowerDescription.includes(term)) {
        score += 10;
      }
    }

    // Bonus for featured products
    // This would need to be passed in if we want to consider it
    // if (featured) score += 15;

    return score;
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (query.length < 2) return [];

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { brand: { name: { contains: query, mode: 'insensitive' as const } } },
          { category: { name: { contains: query, mode: 'insensitive' as const } } },
        ],
      },
      select: {
        name: true,
        brand: {
          select: {
            name: true,
          },
        },
      },
      take: limit * 2, // Get more to filter duplicates
    });

    const suggestions = new Set<string>();
    
    for (const product of products) {
      if (product.name.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(product.name);
      }
      if (product.brand.name.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(product.brand.name);
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get popular search terms
   */
  async getPopularSearchTerms(limit: number = 10): Promise<Array<{ term: string; count: number }>> {
    // This would typically come from a search analytics table
    // For now, return some default popular terms
    return [
      { term: 'iPhone', count: 1000 },
      { term: 'Samsung', count: 850 },
      { term: 'Laptop', count: 720 },
      { term: 'Headphones', count: 650 },
      { term: 'Smartwatch', count: 580 },
      { term: 'Tablet', count: 520 },
      { term: 'Gaming', count: 480 },
      { term: 'Camera', count: 420 },
      { term: 'Speaker', count: 380 },
      { term: 'Charger', count: 350 },
    ].slice(0, limit);
  }
}

export const searchService = new SearchService();