# Frontend Polish Plan: Production-Ready Checklist

## Critical Issues (Fix Now - Day 1)

### 1. **Type Safety & Compiler Strictness**
**Issue:** `any` types used throughout (StoreApp.tsx, all components)
**Impact:** No TypeScript protection, runtime errors go undetected
**Fix:**
```typescript
// Before
interface Shop {
  products: any;
  categories: any;
  setCategory: (c: any) => void;
}

// After
interface ShopProps {
  products: Product[];
  categories: string[];
  category: string;
  setCategory: (c: string) => void;
  query: string;
  setQuery: (q: string) => void;
  selected: Product | null;
  select: (p: Product) => void;
  add: (p: Product) => Promise<void>;
  wish: (p: Product) => Promise<void>;
  wishlist: string[];
  compare: (p: Product) => void;
}
```

**Action:** Extract all component prop types; replace `any` with proper interfaces.

---

### 2. **Error Handling (Zero Error Boundaries)**
**Issue:** No error boundary; single component crash kills entire app
**Current:**
```tsx
export default function StoreApp() {
  // No try-catch at component level
}
```
**Fix:** Create error boundary component:
```typescript
// app/components/ErrorBoundary.tsx
import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="error-page">
            <h1>Something went wrong</h1>
            <p>{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

**Usage in layout.tsx:**
```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

export default function RootLayout({ children }: Props) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

---

### 3. **API Error Handling (Generic Catch All)**
**Issue:** `api<any>()` calls ignore errors or use `.catch(() => {})`
**Current:**
```tsx
api<any>("/products?limit=40")
  .then((d) => d.items?.length && setProducts(d.items))
  .catch(() => {}); // Silent fail

await api("/auth/logout", { method: "POST" }).catch(() => {});
```

**Fix:** Implement proper error handling with user feedback:
```typescript
// app/utils/apiClient.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('gh_token') : null;
  
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string; message?: string };
      throw new ApiError(
        response.status,
        body.message || body.error || `Request failed (${response.status})`,
        body
      );
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, error instanceof Error ? error.message : 'Unknown error', error);
  }
}
```

**Usage with proper error handling:**
```tsx
useEffect(() => {
  const loadProducts = async () => {
    try {
      const data = await api<any>("/products?limit=40");
      if (data?.items?.length) setProducts(data.items);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Handle auth error
        setToken(false);
        localStorage.removeItem('gh_token');
      }
      flash((error as Error).message);
      console.error('Failed to load products:', error);
    }
  };
  
  loadProducts();
}, []);
```

---

### 4. **localStorage Usage (No Validation)**
**Issue:** Trusting localStorage without validation; risk of corrupted token
**Current:**
```tsx
const has = !!localStorage.getItem("gh_token");
localStorage.setItem("gh_token", result.token);
```

**Fix:** Add validation and sanitization:
```typescript
// app/utils/storage.ts
const TOKEN_KEY = 'gh_token';

export const storage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || typeof token !== 'string' || token.length < 20) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  },

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    if (!token || token.length < 20) {
      throw new Error('Invalid token');
    }
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },
};
```

---

### 5. **Environment Variables (No Validation)**
**Issue:** `process.env.NEXT_PUBLIC_API_URL` could be undefined; no fallback validation
**Current:**
```tsx
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
```

**Fix:** Validate on app startup:
```typescript
// app/config.ts
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000/api/v1'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const config = schema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
});

export default config;

// In layout.tsx
import config from './config';

if (!config.NEXT_PUBLIC_API_URL.startsWith('http')) {
  throw new Error('Invalid API URL configuration');
}
```

---

## High-Priority Issues (Week 1)

### 6. **Component Refactor: Extract to Reusable Modules**
**Issue:** 1,500+ lines in single StoreApp.tsx; unmaintainable
**Impact:** Hard to test, debug, reuse components

**Create component structure:**
```
/app/components/
  ├── ErrorBoundary.tsx ← NEW
  ├── Toast.tsx ← NEW
  ├── Navigation.tsx ← NEW
  ├── ProductGrid.tsx ← Extract
  ├── ProductDialog.tsx ← Extract
  ├── pages/
  │   ├── Home.tsx ← Extract
  │   ├── Shop.tsx ← Extract
  │   ├── Account.tsx ← Extract
  │   ├── Cart.tsx ← Extract
  │   ├── Finder.tsx ← Extract
  │   ├── Compare.tsx ← Extract
  │   ├── Services.tsx ← Extract
  │   └── Dashboard/
  │       ├── CustomerDashboard.tsx ← Extract & Rename
  │       └── AdminDashboard.tsx ← Extract
```

---

### 7. **State Management (Prop Drilling)**
**Issue:** Passing 15+ props through components; unmanageable
**Current:**
```tsx
<Dashboard
  user={user}
  navigate={navigate}
  products={products}
  addCart={addCart}
  select={setSelected}
  cartCount={cart.length}
  cart={cart}
  setCart={setCart}
  compareProducts={compare}
  toggleCompare={toggleCompare}
  finderResults={finderResults}
  setFinderResults={setFinderResults}
  flash={flash}
  token={token}
/>
```

**Fix:** Use Context API:
```typescript
// app/context/StoreContext.tsx
import { createContext, ReactNode, useState, useCallback } from 'react';

interface StoreContextType {
  token: boolean;
  user: any;
  cart: Product[];
  wishlist: string[];
  compare: Product[];
  
  setToken: (t: boolean) => void;
  setUser: (u: any) => void;
  addToCart: (p: Product) => Promise<void>;
  removeFromCart: (id: string) => void;
  addToWishlist: (id: string) => Promise<void>;
}

export const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(false);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compare, setCompare] = useState<Product[]>([]);

  const addToCart = useCallback(async (product: Product) => {
    if (product.id.startsWith("demo")) {
      setCart(v => [...v, product]);
      return;
    }
    if (!token) throw new Error("Sign in to save cart");
    
    await api("/cart/items", {
      method: "POST",
      body: JSON.stringify({
        productId: product.id,
        variantId: product.variants?.[0]?.id,
        quantity: 1,
      }),
    });
    setCart(v => [...v, product]);
  }, [token]);

  return (
    <StoreContext.Provider
      value={{
        token,
        user,
        cart,
        wishlist,
        compare,
        setToken,
        setUser,
        addToCart,
        removeFromCart: (id) => setCart(v => v.filter(x => x.id !== id)),
        addToWishlist: async (id) => {
          // ...
        },
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
```

---

### 8. **Form Validation (No Client-Side Validation)**
**Issue:** Forms submit without validation; server is only validation layer
**Current:**
```tsx
<input type="email" name="email" required placeholder="Email address" />
<input
  type="password"
  name="password"
  required
  minLength={8}
  placeholder="Password"
/>
```

**Fix:** Add Zod + React Hook Form:
```bash
npm install react-hook-form zod @hookform/resolvers
```

```typescript
// app/schemas/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Invalid phone number').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
```

```tsx
// app/components/AuthForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/schemas/auth';

export function AuthForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label>
        Email
        <input {...register('email')} type="email" />
        {errors.email && <span className="error">{errors.email.message}</span>}
      </label>
      <label>
        Password
        <input {...register('password')} type="password" />
        {errors.password && <span className="error">{errors.password.message}</span>}
      </label>
    </form>
  );
}
```

---

### 9. **Loading States (No Loading Indicators)**
**Issue:** Form submissions have `disabled={busy}` but no loading UI feedback
**Impact:** Users don't know if request is processing
**Fix:** Add loading spinner component:

```tsx
// app/components/LoadingSpinner.tsx
export function LoadingSpinner() {
  return <div className="spinner" aria-label="Loading" />;
}

// Usage
<button disabled={loading}>
  {loading ? <LoadingSpinner /> : 'Continue to checkout'}
</button>
```

Add CSS:
```css
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #333;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

### 10. **Toast Notifications (Fragile)**
**Issue:** `flash()` function sets message; setTimeout clears it - if component unmounts, doesn't cleanup
**Current:**
```tsx
const flash = (message: string) => {
  setNotice(message);
  setTimeout(() => setNotice(""), 2600); // Potential memory leak
};
```

**Fix:** Create reusable Toast component:
```tsx
// app/components/Toast.tsx
interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, onClose, duration = 2600 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer); // Cleanup
  }, [onClose, duration]);

  return (
    <div className="toast" role="alert">
      {message}
      <button onClick={onClose} aria-label="Close">×</button>
    </div>
  );
}
```

---

## Medium-Priority Issues (Week 2)

### 11. **Image Optimization**
**Issue:** Rendering `<img>` directly; no lazy loading, no optimization
**Current:**
```tsx
<img src={product.images[0].url} alt={product.images[0].alt || product.name} />
```

**Fix:** Use Next.js Image component:
```bash
npm install next-image-export-optimizer
```

```tsx
import Image from 'next/image';

<Image
  src={product.images[0].url}
  alt={product.images[0].alt || product.name}
  width={300}
  height={300}
  placeholder="blur"
  blurDataURL="data:image/png;base64,..." // Small placeholder
  loading="lazy"
/>
```

---

### 12. **Debounced Search**
**Issue:** Search input triggers filter on every keystroke
**Current:**
```tsx
<input
  value={p.query}
  onChange={(e: any) => p.setQuery(e.target.value)}
  placeholder="Search products"
/>
```

**Fix:** Add debounce:
```typescript
// app/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

```tsx
const debouncedQuery = useDebounce(query, 300);

useEffect(() => {
  // Trigger search with debounced query
  filterProducts(debouncedQuery);
}, [debouncedQuery]);
```

---

### 13. **Cart Persistence**
**Issue:** Cart is in-memory only; resets on page refresh
**Fix:** Sync cart with localStorage and backend:

```typescript
// app/hooks/useCart.ts
export function useCart() {
  const [cart, setCart] = useState<Product[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse cart:', e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addItem = async (product: Product) => {
    if (!token) throw new Error('Sign in required');
    await api('/cart/items', {
      method: 'POST',
      body: JSON.stringify({
        productId: product.id,
        variantId: product.variants?.[0]?.id,
        quantity: 1,
      }),
    });
    setCart(prev => [...prev, product]);
  };

  return { cart, addItem };
}
```

---

### 14. **Keyboard Navigation**
**Issue:** Modals/dialogs don't trap focus; no ESC key to close
**Current:**
```tsx
<div className="modal" onMouseDown={close}>
```

**Fix:** Add keyboard handler:
```tsx
function ProductDialog({ product, close, add, wish, compare }: any) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  return (
    <div className="modal" role="dialog" aria-modal="true" onMouseDown={close}>
      <article onMouseDown={(e) => e.stopPropagation()}>
        {/* ... */}
      </article>
    </div>
  );
}
```

---

### 15. **Accessibility (No ARIA Labels)**
**Issue:** Missing `aria-label`, `role`, `aria-live`
**Fix:**
```tsx
// Before
<button className="menu" onClick={() => setMenu(!menu)}>☰</button>

// After
<button 
  className="menu" 
  onClick={() => setMenu(!menu)}
  aria-label="Toggle menu"
  aria-expanded={menu}
>
  ☰
</button>
```

---

## Low-Priority Enhancements (Week 3+)

### 16. **Performance Monitoring**
Add Sentry:
```bash
npm install @sentry/next
```

### 17. **A/B Testing Ready**
Prepare component variants for testing.

### 18. **Offline Support**
Add service worker for offline functionality.

### 19. **Analytics Integration**
Add Google Analytics 4 tracking.

### 20. **Mobile App Variant**
Export as PWA for app stores.

---

## Action Priority Queue

### Day 1 (Today)
1. ✅ Extract all components to separate files
2. ✅ Replace `any` with proper TypeScript interfaces
3. ✅ Add ErrorBoundary to layout
4. ✅ Implement proper API error handling
5. ✅ Add environment validation

### Day 2-3
6. ✅ Implement Context API for state management
7. ✅ Add form validation with Zod + React Hook Form
8. ✅ Add loading spinners
9. ✅ Fix Toast notifications with cleanup
10. ✅ Debounce search input

### End of Week
11. ✅ Image optimization with Next.js Image
12. ✅ Cart persistence
13. ✅ Keyboard navigation + Escape key
14. ✅ Add ARIA labels (accessibility)
15. ✅ Test on mobile devices

---

## Build & Test Commands

```bash
# Type check
npm run build

# Lint (ESLint)
npm run lint

# Tests (add vitest)
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm run test

# Build for production
npm run build

# Start production server
npm run start
```

---

## Success Metrics

- ✅ Zero `any` types (100% TypeScript coverage)
- ✅ All forms validated client & server-side
- ✅ <3s First Contentful Paint
- ✅ Lighthouse score >80 on desktop
- ✅ Mobile checkout flow <2 min
- ✅ Zero console errors on main user flows
- ✅ All routes keyboard accessible
- ✅ Error boundary catches all crashes
- ✅ Cart persists across sessions
- ✅ API errors show user-friendly messages

