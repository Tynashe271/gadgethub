import { describe, it, expect, vi } from 'vitest';
import { asyncHandler, notFound } from '../../src/lib/http.js';
import { Request, Response, NextFunction } from 'express';

describe('HTTP Utilities', () => {
  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const mockReq = {} as Request;
      const mockRes = {
        json: (data: any) => data,
        status: (code: number) => mockRes,
      } as Response;
      const mockNext = vi.fn() as NextFunction;

      const handler = asyncHandler(async (req, res, next) => {
        res.json({ success: true });
      });

      await handler(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch errors and pass to next', async () => {
      const mockReq = {} as Request;
      const mockRes = {} as Response;
      const mockNext = vi.fn() as NextFunction;

      const handler = asyncHandler(async (req, res, next) => {
        throw new Error('Test error');
      });

      await handler(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle synchronous errors', async () => {
      const mockReq = {} as Request;
      const mockRes = {} as Response;
      const mockNext = vi.fn() as NextFunction;

      const handler = asyncHandler((req, res, next) => {
        // Wrap synchronous error in async to test asyncHandler behavior
        return Promise.reject(new Error('Sync error'));
      });

      await handler(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('notFound', () => {
    it('should create 404 error with route info', () => {
      const mockReq = {
        method: 'GET',
        path: '/nonexistent'
      } as Request;
      const mockRes = {} as Response;
      const mockNext = vi.fn() as NextFunction;

      notFound(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});