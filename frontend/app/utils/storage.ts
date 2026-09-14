// app/utils/storage.ts
import type { Product, User } from '@/types';

const TOKEN_KEY = 'gh_token';
const CART_KEY = 'gh_cart';
const USER_KEY = 'gh_user';

export const storage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token || typeof token !== 'string' || token.length < 20) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return token;
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    if (!token || token.length < 20) {
      throw new Error('Invalid token');
    }
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      console.error('Failed to save token to localStorage');
    }
  },

  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') as User | null; }
    catch { return null; }
  },

  setUser(user: User): void {
    if (typeof window !== 'undefined') localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearToken(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      console.error('Failed to clear token from localStorage');
    }
  },

  getCart(): Product[] {
    if (typeof window === 'undefined') return [];
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(value)
        ? value.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
        : [];
    } catch {
      localStorage.removeItem(CART_KEY);
      return [];
    }
  },

  setCart(cart: Product[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      console.error('Failed to save cart to localStorage');
    }
  },

};
