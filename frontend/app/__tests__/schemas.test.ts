// app/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from '../schemas/auth';
import { finderSchema } from '../schemas/finder';
import { tradeInSchema, repairSchema, supportTicketSchema } from '../schemas/services';

describe('Auth Schemas', () => {
  it('validates login schema with valid data', () => {
    const data = {
      email: 'test@example.com',
      password: 'password123',
    };
    expect(() => loginSchema.parse(data)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const data = {
      email: 'invalid-email',
      password: 'password123',
    };
    expect(() => loginSchema.parse(data)).toThrow();
  });

  it('validates register schema with password match', () => {
    const data = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };
    expect(() => registerSchema.parse(data)).not.toThrow();
  });

  it('rejects mismatched passwords', () => {
    const data = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'different',
    };
    expect(() => registerSchema.parse(data)).toThrow();
  });
});

describe('Finder Schema', () => {
  it('validates finder schema with valid budget', () => {
    const data = {
      budget: 1200,
      use: 'GENERAL',
    };
    expect(() => finderSchema.parse(data)).not.toThrow();
  });

  it('rejects budget exceeding max', () => {
    const data = {
      budget: 15000,
      use: 'GENERAL',
    };
    expect(() => finderSchema.parse(data)).toThrow();
  });

  it('rejects zero or negative budget', () => {
    const data = {
      budget: 0,
      use: 'GENERAL',
    };
    expect(() => finderSchema.parse(data)).toThrow();
  });
});

describe('Services Schemas', () => {
  it('validates trade-in schema', () => {
    const data = {
      deviceModel: 'iPhone 14',
      storage: '256GB',
      details: 'Device in excellent condition with minimal scratches',
    };
    expect(() => tradeInSchema.parse(data)).not.toThrow();
  });

  it('validates repair schema', () => {
    const data = {
      productReference: 'ABC123',
      problem: 'Screen is cracked and display is not working properly',
    };
    expect(() => repairSchema.parse(data)).not.toThrow();
  });

  it('validates support ticket schema', () => {
    const data = {
      subject: 'Need help with my order',
      message: 'I ordered a product yesterday but have not received confirmation email',
    };
    expect(() => supportTicketSchema.parse(data)).not.toThrow();
  });
});
