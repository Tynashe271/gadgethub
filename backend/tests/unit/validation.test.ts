import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate, AppError } from '../../src/lib/http.js';

describe('Validation Utilities', () => {
  describe('validate function', () => {
    it('should validate correct data', () => {
      const schema = z.object({
        email: z.email(),
        age: z.number().min(18),
      });
      
      const data = { email: 'test@example.com', age: 25 };
      const result = validate(schema, data);
      
      expect(result).toEqual(data);
    });

    it('should throw on invalid data', () => {
      const schema = z.object({
        email: z.email(),
        age: z.number().min(18),
      });
      
      const data = { email: 'invalid-email', age: 15 };
      
      expect(() => {
        validate(schema, data);
      }).toThrow();
    });

    it('should handle nested validation', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(1),
          contact: z.object({
            email: z.email(),
            phone: z.string().min(10),
          }),
        }),
      });
      
      const validData = {
        user: {
          name: 'John Doe',
          contact: {
            email: 'john@example.com',
            phone: '1234567890',
          },
        },
      };
      
      const result = validate(schema, validData);
      expect(result).toEqual(validData);
    });

    it('should handle array validation', () => {
      const schema = z.object({
        items: z.array(z.object({ id: z.string(), name: z.string() })),
      });
      
      const data = {
        items: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ],
      };
      
      const result = validate(schema, data);
      expect(result).toEqual(data);
    });

    it('should handle optional fields', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().optional(),
        email: z.email().optional(),
      });
      
      const data1 = { name: 'John', age: 25 };
      const data2 = { name: 'Jane', email: 'jane@example.com' };
      const data3 = { name: 'Bob' };
      
      expect(validate(schema, data1)).toEqual(data1);
      expect(validate(schema, data2)).toEqual(data2);
      expect(validate(schema, data3)).toEqual(data3);
    });

    it('should handle enum validation', () => {
      const statusEnum = z.enum(['ACTIVE', 'INACTIVE', 'PENDING']);
      const schema = z.object({ status: statusEnum });
      
      expect(validate(schema, { status: 'ACTIVE' })).toEqual({ status: 'ACTIVE' });
      expect(() => validate(schema, { status: 'INVALID' })).toThrow();
    });

    it('should handle transformation', () => {
      const schema = z.object({
        email: z.string().email().transform(val => val.toLowerCase()),
        age: z.string().transform(val => parseInt(val, 10)),
      });
      
      const data = { email: 'TEST@EXAMPLE.COM', age: '25' };
      const result = validate(schema, data);
      
      expect(result.email).toBe('test@example.com');
      expect(result.age).toBe(25);
    });
  });

  describe('AppError class', () => {
    it('should create error with status and message', () => {
      const error = new AppError(404, 'Not found');
      
      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.details).toBeUndefined();
    });

    it('should create error with details', () => {
      const details = { field: 'email', reason: 'Invalid format' };
      const error = new AppError(400, 'Validation failed', details);
      
      expect(error.status).toBe(400);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual(details);
    });

    it('should be instance of Error', () => {
      const error = new AppError(500, 'Server error');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });
  });
});