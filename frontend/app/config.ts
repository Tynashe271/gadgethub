// app/config.ts
import { z } from 'zod';

const configSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000/api/v1'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const config = configSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
});

// Validate on startup
if (!config.NEXT_PUBLIC_API_URL.startsWith('http')) {
  throw new Error('Invalid API URL configuration');
}

export default config;
