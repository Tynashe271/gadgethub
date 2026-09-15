// app/schemas/checkout.ts
import { z } from 'zod';

export const addressSchema = z.object({
  street: z.string().min(3, 'Street address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().optional(),
  postalCode: z.string().min(3, 'Postal code required'),
  country: z.string().min(2, 'Country required'),
  type: z.enum(['home', 'work', 'other']).optional(),
  isDefault: z.boolean().optional(),
});

export const checkoutSchema = z.object({
  addressId: z.string().min(1, 'Select a delivery address'),
  paymentMethod: z.enum(['CARD', 'TRANSFER', 'CASH'], {
    error: 'Select a valid payment method',
  }),
  deliveryMethod: z.string().min(1, 'Select a delivery method'),
  couponCode: z.string().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
