import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default(
      'postgresql://postgres:[REDACTED]@localhost:5432/gadgethub?schema=public'
    ),
  JWT_SECRET: z
    .string()
    .min(32)
    .default('development-only-secret-change-me-now'),
  JWT_EXPIRES_IN: z
    .string()
    .default('24h'),
  JWT_ISSUER: z.string().min(1).default('gadgethub-api'),
  JWT_AUDIENCE: z.string().min(1).default('gadgethub-clients'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export const config = schema.parse(process.env);
