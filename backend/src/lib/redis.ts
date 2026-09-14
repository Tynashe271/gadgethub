import { createClient, type RedisClientType } from 'redis';
import { config } from '../config.js';

const globalForRedis = globalThis as unknown as { redis?: RedisClientType };

export const redis = globalForRedis.redis ?? createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis reconnection attempts exhausted');
        return new Error('Redis reconnection failed');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

redis.on('error', (err) => console.error('Redis Client Error:', err));
redis.on('connect', () => console.log('Redis Client Connected'));
redis.on('reconnecting', () => console.log('Redis Client Reconnecting'));

// Initialize Redis connection
if (!redis.isOpen) {
  redis.connect().catch((err) => {
    console.error('Failed to connect to Redis:', err);
  });
}

export class CacheService {
  private client: RedisClientType;
  private defaultTTL = 3600; // 1 hour in seconds

  constructor(client: RedisClientType) {
    this.client = client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl ?? this.defaultTTL;
      await this.client.setEx(key, expiry, serialized);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  async invalidate(key: string): Promise<void> {
    await this.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    await this.delPattern(pattern);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.client.mGet(keys);
      return values.map((value) => (value ? JSON.parse(value) : null));
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValues: Record<string, unknown>, ttl?: number): Promise<void> {
    try {
      const pipeline = this.client.multi();
      const expiry = ttl ?? this.defaultTTL;

      for (const [key, value] of Object.entries(keyValues)) {
        const serialized = JSON.stringify(value);
        pipeline.setEx(key, expiry, serialized);
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Cache mset error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl);
    } catch (error) {
      console.error('Cache expire error:', error);
    }
  }

  async flush(): Promise<void> {
    try {
      await this.client.flushDb();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}

export const cache = new CacheService(redis);

// Cache key generators
export const CacheKeys = {
  product: (id: string) => `product:${id}`,
  productSlug: (slug: string) => `product:slug:${slug}`,
  products: (params: string) => `products:${params}`,
  category: (id: string) => `category:${id}`,
  categories: () => 'categories:all',
  brand: (id: string) => `brand:${id}`,
  brands: () => 'brands:all',
  user: (id: string) => `user:${id}`,
  cart: (userId: string) => `cart:${userId}`,
  orders: (userId: string) => `orders:${userId}`,
  promotions: () => 'promotions:active',
  banners: () => 'banners:active',
  settings: (key: string) => `setting:${key}`,
};