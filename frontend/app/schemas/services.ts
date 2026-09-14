// app/schemas/services.ts
import { z } from 'zod';

export const tradeInSchema = z.object({
  deviceModel: z.string().min(2, 'Device model required'),
  storage: z.string().optional(),
  details: z.string().min(5, 'Provide at least 5 characters describing the condition'),
});

export const repairSchema = z.object({
  productReference: z.string().min(1, 'Product reference required'),
  problem: z.string().min(10, 'Describe the problem in at least 10 characters'),
  email: z.string().email('Valid email required').optional(),
});

export const supportTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  email: z.string().email('Valid email required').optional(),
});

export type TradeInInput = z.infer<typeof tradeInSchema>;
export type RepairInput = z.infer<typeof repairSchema>;
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
