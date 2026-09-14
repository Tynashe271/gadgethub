// app/context/StoreContext.tsx
'use client';

import { createContext, useContext, ReactNode, useState, useCallback, useEffect, useRef } from 'react';
import { api, ApiException } from '../utils/apiClient';
import { storage } from '../utils/storage';
import type { Product, User, AuthResponse } from '@/types';
import { loadPreferences } from '../utils/preferences';

interface StoreContextType {
  // Auth
  token: boolean;
  authReady: boolean;
  user: User | null;
  login: (data: AuthResponse) => void;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;

  // Cart
  cart: Product[];
  addToCart: (product: Product) => Promise<void>;
  removeFromCart: (id: string) => void;
  changeQuantity: (product: Product, delta: number) => void;
  clearCart: () => void;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (product: Product) => Promise<void>;

  // Compare
  compare: Product[];
  toggleCompare: (product: Product) => void;
  clearCompare: () => void;

  // Products
  products: Product[];
  loadProducts: () => Promise<void>;

  // Notifications
  notification: string;
  showNotification: (message: string) => void;
  hideNotification: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // Auth state
  const [token, setToken] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Cart state
  const [cart, setCart] = useState<Product[]>([]);

  // Wishlist state
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Compare state
  const [compare, setCompare] = useState<Product[]>([]);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);

  // Notification state
  const [notification, setNotification] = useState('');
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPersistentCommerceState = useCallback(async () => {
    try {
      const [serverCart, serverWishlist] = await Promise.all([
        api<{ items: Array<{ quantity: number; product: Product }> }>('/cart'),
        api<Array<{ productId: string }>>('/profile/wishlist'),
      ]);
      setCart(serverCart.items.flatMap((item) => Array.from({ length: item.quantity }, () => item.product)));
      setWishlist(serverWishlist.map((item) => item.productId));
    } catch (error) {
      console.error('Failed to load saved cart and wishlist:', error);
    }
  }, []);

  useEffect(() => {
    if (authReady) storage.setCart(cart);
  }, [cart, authReady]);

  // Auth functions
  const login = useCallback((data: AuthResponse) => {
    storage.setToken(data.token);
    storage.setUser(data.user);
    setToken(true);
    setUser(data.user);
    void loadPersistentCommerceState();
    void loadPreferences().catch((error) => console.error('Failed to load preferences:', error));
  }, [loadPersistentCommerceState]);

  const logout = useCallback(async () => {
    const logoutRequest = api('/auth/logout', { method: 'POST' });
    storage.clearToken();
    setToken(false);
    setUser(null);
    setCart([]);
    try {
      await logoutRequest;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const userData = await api<User>('/auth/me');
      setUser(userData);
    } catch (error) {
      if (error instanceof ApiException && error.status === 401) {
        storage.clearToken();
        setToken(false);
        setUser(null);
      }
      console.error('Failed to load user:', error);
      const cachedUser = storage.getUser();
      if (cachedUser) setUser(cachedUser);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((current) => current ? { ...current, ...updates } : current);
  }, []);

  // Products functions
  const loadProducts = useCallback(async () => {
    try {
      const data = await api<{ items: Product[] }>('/products?limit=40');
      const catalogue = data.items ?? [];
      setProducts(catalogue);
      const savedCart = storage.getCart();
      if (catalogue.length && savedCart.some((item) => !catalogue.some((product) => product.id === item.id))) {
        const migrated = savedCart.map((item) => {
          if (catalogue.some((product) => product.id === item.id)) return item;
          const variantSku = item.variants?.[0]?.sku;
          return catalogue.find((product) => product.variants?.some((variant) => variant.sku === variantSku))
            ?? catalogue.find((product) => product.slug === item.slug)
            ?? item;
        }).filter((item) => catalogue.some((product) => product.id === item.id));
        setCart(migrated);
        storage.setCart(migrated);

        if (storage.getToken()) {
          try {
            const serverCart = await api<{items:Array<{id:string;productId:string;quantity:number}>}>('/cart');
            const quantities = new Map<string, { product: Product; quantity: number }>();
            for (const product of migrated) {
              const current = quantities.get(product.id);
              quantities.set(product.id, { product, quantity: (current?.quantity ?? 0) + 1 });
            }
            for (const { product, quantity } of quantities.values()) {
              const existing = serverCart.items.find((item) => item.productId === product.id);
              if (existing) {
                await api(`/cart/items/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
              } else {
                await api('/cart/items', { method: 'POST', body: JSON.stringify({ productId: product.id, variantId: product.variants?.[0]?.id, quantity }) });
              }
            }
          } catch (migrationError) {
            console.error('Failed to synchronize migrated cart:', migrationError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  // Initialize only after the callbacks it uses have been initialized.
  useEffect(() => {
    const initialize = async () => {
      try {
        const authToken = storage.getToken();
        setCart(storage.getCart());
        if (authToken) {
          setToken(true);
          await loadUser();
          await loadPersistentCommerceState();
          await loadPreferences().catch((error) => console.error('Failed to load preferences:', error));
        }
      } finally {
        setAuthReady(true);
        void loadProducts();
      }
    };

    void initialize();
  }, [loadPersistentCommerceState, loadProducts, loadUser]);

  // Keep an already-open storefront synchronized with catalogue and stock
  // changes made in the admin app. Focus/visibility refreshes are immediate;
  // the interval covers long-running foreground sessions.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void loadProducts(); };
    const interval = window.setInterval(refresh, 15_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadProducts]);

  // Notification functions
  const showNotification = useCallback((message: string) => {
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    setNotification(message);
    notificationTimer.current = setTimeout(() => {
      setNotification('');
      notificationTimer.current = null;
    }, 2600);
  }, []);

  const hideNotification = useCallback(() => {
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    notificationTimer.current = null;
    setNotification('');
  }, []);

  // Cart functions
  const addToCart = useCallback(
    async (product: Product) => {
      setCart((v) => [...v, product]);
      showNotification('Added to cart');

      if (token) {
        try {
        await api('/cart/items', {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id,
            variantId: product.variants?.[0]?.id,
            quantity: 1,
          }),
        });
        } catch (error) {
          console.error('Failed to sync cart item:', error);
        }
      }
    },
    [token, showNotification]
  );

  const removeFromCart = useCallback(async (id: string) => {
    setCart((v) => v.filter((p) => p.id !== id));
    if (token) {
      try {
        const serverCart = await api<{items:Array<{id:string;productId:string}>}>('/cart');
        const item = serverCart.items.find((entry) => entry.productId === id);
        if (item) await api(`/cart/items/${item.id}`, { method: 'DELETE' });
      } catch (error) { console.error('Failed to remove server cart item:', error); }
    }
  }, [token]);

  const changeQuantity = useCallback(async (product: Product, delta: number) => {
    if (delta > 0) {
      setCart((v) => [...v, product]);
    } else {
      setCart((v) => {
        const index = v.findIndex((p) => p.id === product.id);
        return index >= 0
          ? [...v.slice(0, index), ...v.slice(index + 1)]
          : v;
      });
    }
    if (token) {
      try {
        const serverCart = await api<{items:Array<{id:string;productId:string;quantity:number}>}>('/cart');
        const item = serverCart.items.find((entry) => entry.productId === product.id);
        if (!item && delta > 0) {
          await api('/cart/items', { method: 'POST', body: JSON.stringify({ productId: product.id, variantId: product.variants?.[0]?.id, quantity: 1 }) });
        } else if (item) {
          const quantity = item.quantity + delta;
          if (quantity <= 0) await api(`/cart/items/${item.id}`, { method: 'DELETE' });
          else await api(`/cart/items/${item.id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
        }
      } catch (error) { console.error('Failed to sync cart quantity:', error); }
    }
  }, [token]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Wishlist functions
  const toggleWishlist = useCallback(
    async (product: Product) => {
      const active = wishlist.includes(product.id);
      setWishlist((v) =>
        active ? v.filter((x) => x !== product.id) : [...v, product.id]
      );

      if (token) {
        try {
          await api(`/profile/wishlist/${product.id}`, {
            method: active ? 'DELETE' : 'POST',
          });
        } catch (error) {
          console.error('Failed to update wishlist:', error);
          await loadPersistentCommerceState();
          showNotification('Wishlist could not be updated');
          return;
        }
      }

      showNotification(
        active ? 'Removed from wishlist' : 'Saved to wishlist'
      );
    },
    [token, wishlist, loadPersistentCommerceState, showNotification]
  );

  // Compare functions
  const toggleCompare = useCallback((product: Product) => {
    setCompare((v) =>
      v.some((x) => x.id === product.id)
        ? v.filter((x) => x.id !== product.id)
        : v.length < 4
          ? [...v, product]
          : v
    );

    showNotification(
      compare.length >= 4 && !compare.some((x) => x.id === product.id)
        ? 'Compare up to four products'
        : 'Comparison updated'
    );
  }, [compare, showNotification]);

  const clearCompare = useCallback(() => {
    setCompare([]);
  }, []);

  useEffect(() => () => {
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
  }, []);

  const value: StoreContextType = {
    token,
    authReady,
    user,
    login,
    logout,
    loadUser,
    updateUser,
    cart,
    addToCart,
    removeFromCart,
    changeQuantity,
    clearCart,
    wishlist,
    toggleWishlist,
    compare,
    toggleCompare,
    clearCompare,
    products,
    loadProducts,
    notification,
    showNotification,
    hideNotification,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}
