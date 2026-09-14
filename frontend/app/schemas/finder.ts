// app/schemas/finder.ts
import { z } from 'zod';

export const finderSchema = z.object({
  budget: z.coerce
    .number()
    .positive('Budget must be greater than 0')
    .max(10000, 'Budget cannot exceed $10,000'),
  brand: z.string().optional(),
  storage: z.string().optional(),
  ram: z.string().optional(),
  camera: z.string().optional(),
  battery: z.string().optional(),
  use: z.enum(['GENERAL', 'PHOTOGRAPHY', 'GAMING', 'BUSINESS']),
  condition: z.string().optional(),
});

export type FinderInput = z.infer<typeof finderSchema>;
