import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
process.env.JWT_EXPIRES_IN = '24h';

const config = {
  JWT_SECRET: process.env.JWT_SECRET || 'test-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
};

describe('Authentication Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 12);
      
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should compare passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 12);
      
      const isValid = await bcrypt.compare(password, hash);
      const isInvalid = await bcrypt.compare('WrongPassword', hash);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('should handle different cost factors', async () => {
      const password = 'TestPassword123!';
      const hash1 = await bcrypt.hash(password, 8);
      const hash2 = await bcrypt.hash(password, 12);
      
      expect(hash1).not.toBe(hash2);
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid JWT tokens', () => {
      const payload = { sub: 'user123', role: 'CUSTOMER', jti: 'session123' };
      const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '24h' });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify JWT tokens correctly', () => {
      const payload = { sub: 'user123', role: 'CUSTOMER', jti: 'session123' };
      const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '24h' });
      
      const decoded = jwt.verify(token, config.JWT_SECRET) as typeof payload;
      
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.jti).toBe(payload.jti);
    });

    it('should reject invalid tokens', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        jwt.verify(invalidToken, config.JWT_SECRET);
      }).toThrow();
    });

    it('should reject tokens with wrong secret', () => {
      const payload = { sub: 'user123', role: 'CUSTOMER', jti: 'session123' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '24h' });
      
      expect(() => {
        jwt.verify(token, config.JWT_SECRET);
      }).toThrow();
    });
  });

  describe('Token Expiration', () => {
    it('should handle token expiration', () => {
      const payload = { sub: 'user123', role: 'CUSTOMER', jti: 'session123' };
      const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '0s' });
      
      // Wait a moment to ensure expiration
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => {
            jwt.verify(token, config.JWT_SECRET);
          }).toThrow();
          resolve(undefined);
        }, 1000);
      });
    });

    it('should accept valid non-expired tokens', () => {
      const payload = { sub: 'user123', role: 'CUSTOMER', jti: 'session123' };
      const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '24h' });
      
      const decoded = jwt.verify(token, config.JWT_SECRET);
      expect(decoded).toBeDefined();
    });
  });
});