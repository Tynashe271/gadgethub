import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { ProductCondition, Role } from '@prisma/client';

describe('Products API Integration Tests', () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let testCategory: any;
  let testBrand: any;
  let testProduct: any;
  const testProductIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();
    
    // Create test data
    testCategory = await prisma.category.create({
      data: {
        name: `Test Category ${runId}`,
        slug: `test-category-${runId}`,
        description: 'Test category for integration tests',
      },
    });

    testBrand = await prisma.brand.create({
      data: {
        name: `Test Brand ${runId}`,
        slug: `test-brand-${runId}`,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.product.deleteMany({
      where: { id: { in: testProductIds } },
    });
    await prisma.brand.delete({ where: { id: testBrand.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create a test product before each test
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        slug: `test-product-${Date.now()}`,
        sku: `TEST-${Date.now()}`,
        reference: `REF-${Date.now()}`,
        description: 'Test product description',
        price: 99.99,
        condition: ProductCondition.BRAND_NEW,
        categoryId: testCategory.id,
        brandId: testBrand.id,
        images: {
          create: [
            {
              url: 'https://example.com/image1.jpg',
              alt: 'Test image',
              sortOrder: 0,
            },
          ],
        },
        specifications: {
          create: [
            {
              name: 'Specification 1',
              value: 'Value 1',
              group: 'General',
            },
          ],
        },
      },
    });
    testProductIds.push(testProduct.id);
  });

  it('should create a product with valid data', () => {
    expect(testProduct).toBeDefined();
    expect(testProduct.name).toBe('Test Product');
    expect(Number(testProduct.price)).toBe(99.99);
    expect(testProduct.condition).toBe(ProductCondition.BRAND_NEW);
  });

  it('should retrieve product by slug', async () => {
    const product = await prisma.product.findUnique({
      where: { slug: testProduct.slug },
      include: {
        brand: true,
        category: true,
        images: true,
        specifications: true,
      },
    });

    expect(product).toBeDefined();
    expect(product?.name).toBe('Test Product');
    expect(product?.brand.name).toBe(`Test Brand ${runId}`);
    expect(product?.category.name).toBe(`Test Category ${runId}`);
    expect(product?.images.length).toBeGreaterThan(0);
    expect(product?.specifications.length).toBeGreaterThan(0);
  });

  it('should update product data', async () => {
    const updated = await prisma.product.update({
      where: { id: testProduct.id },
      data: {
        price: 149.99,
        featured: true,
      },
    });

    expect(Number(updated.price)).toBe(149.99);
    expect(updated.featured).toBe(true);
  });

  it('should handle product variants', async () => {
    const variant = await prisma.productVariant.create({
      data: {
        sku: `VARIANT-${Date.now()}`,
        storage: '128GB',
        colour: 'Black',
        priceAdjustment: 10.00,
        productId: testProduct.id,
        inventory: {
          create: {
            quantity: 50,
            lowStockAt: 5,
          },
        },
      },
    });

    expect(variant).toBeDefined();
    expect(variant.storage).toBe('128GB');

    // Cleanup
    await prisma.productVariant.delete({ where: { id: variant.id } });
  });

  it('should search products with filters', async () => {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        category: { slug: testCategory.slug },
        brand: { slug: testBrand.slug },
        condition: ProductCondition.BRAND_NEW,
        price: { gte: 50, lte: 200 },
      },
      include: {
        brand: true,
        category: true,
      },
    });

    expect(products.length).toBeGreaterThan(0);
    expect(products.every(p => p.category.slug === testCategory.slug)).toBe(true);
  });

  it('should handle product view tracking', async () => {
    const view = await prisma.productView.create({
      data: {
        productId: testProduct.id,
      },
    });

    expect(view).toBeDefined();
    expect(view.productId).toBe(testProduct.id);

    // Cleanup
    await prisma.productView.delete({ where: { id: view.id } });
  });

  it('should soft delete products', async () => {
    await prisma.product.update({
      where: { id: testProduct.id },
      data: { isActive: false },
    });

    const product = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });

    expect(product?.isActive).toBe(false);

    // Restore for other tests
    await prisma.product.update({
      where: { id: testProduct.id },
      data: { isActive: true },
    });
  });
});
