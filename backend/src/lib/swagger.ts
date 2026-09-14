import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GadgetHub API',
      version: '1.0.0',
      description: 'A comprehensive e-commerce API for GadgetHub',
      contact: {
        name: 'API Support',
        email: 'support@gadgethub.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.tinashenyenyesatech.ac.zw/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            avatarUrl: { type: 'string', nullable: true },
            role: {
              type: 'string',
              enum: ['CUSTOMER', 'SUPPORT', 'DELIVERY', 'INVENTORY', 'PRODUCT', 'ORDER', 'STORE_MANAGER', 'SUPER_ADMIN'],
            },
            loyaltyPoints: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            sku: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number', format: 'decimal' },
            discountPrice: { type: 'number', format: 'decimal', nullable: true },
            condition: {
              type: 'string',
              enum: ['BRAND_NEW', 'EXCELLENT', 'GOOD', 'REFURBISHED'],
            },
            warrantyMonths: { type: 'integer' },
            featured: { type: 'boolean' },
            viewCount: { type: 'integer' },
            isActive: { type: 'boolean' },
            brand: { $ref: '#/components/schemas/Brand' },
            category: { $ref: '#/components/schemas/Category' },
            images: { type: 'array', items: { $ref: '#/components/schemas/ProductImage' } },
            variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariant' } },
            reviews: { type: 'array', items: { $ref: '#/components/schemas/Review' } },
          },
        },
        Brand: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            logoUrl: { type: 'string', nullable: true },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string', nullable: true },
          },
        },
        ProductImage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            url: { type: 'string' },
            alt: { type: 'string', nullable: true },
            sortOrder: { type: 'integer' },
          },
        },
        ProductVariant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sku: { type: 'string' },
            storage: { type: 'string', nullable: true },
            colour: { type: 'string', nullable: true },
            ram: { type: 'string', nullable: true },
            priceAdjustment: { type: 'number', format: 'decimal' },
            inventory: { $ref: '#/components/schemas/Inventory' },
          },
        },
        Inventory: {
          type: 'object',
          properties: {
            quantity: { type: 'integer' },
            reserved: { type: 'integer' },
            lowStockAt: { type: 'integer' },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            title: { type: 'string', nullable: true },
            body: { type: 'string' },
            verified: { type: 'boolean' },
            approved: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderNumber: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PLACED', 'PAYMENT_CONFIRMED', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
            },
            subtotal: { type: 'number', format: 'decimal' },
            discount: { type: 'number', format: 'decimal' },
            deliveryFee: { type: 'number', format: 'decimal' },
            total: { type: 'number', format: 'decimal' },
            items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            payments: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
            delivery: { $ref: '#/components/schemas/Delivery' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            sku: { type: 'string' },
            quantity: { type: 'integer' },
            unitPrice: { type: 'number', format: 'decimal' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            method: {
              type: 'string',
              enum: ['ECOCASH', 'ONEMONEY', 'BANK_TRANSFER', 'CARD', 'CASH_ON_DELIVERY'],
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
            },
            amount: { type: 'number', format: 'decimal' },
            providerReference: { type: 'string', nullable: true },
          },
        },
        Delivery: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            method: { type: 'string' },
            status: { type: 'string' },
            trackingNumber: { type: 'string', nullable: true },
            fee: { type: 'number', format: 'decimal' },
          },
        },
        Cart: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer' },
            product: { $ref: '#/components/schemas/Product' },
            variant: { $ref: '#/components/schemas/ProductVariant', nullable: true },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'object' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);