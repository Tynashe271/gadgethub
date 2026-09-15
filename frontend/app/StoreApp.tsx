// app/StoreApp.tsx
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toast } from './components/Toast';
import { Navigation } from './components/Navigation';
import { ProductDialog } from './components/ProductDialog';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { Cart } from './pages/Cart';
import { Compare } from './pages/Compare';
import { Finder } from './pages/Finder';
import { Services } from './pages/Services';
import { Account } from './pages/Account';
import { Assistant } from './pages/Assistant';
import { Feedback } from './pages/Feedback';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { DashboardShell } from './components/DashboardShell';
import { Footer } from './pages/Footer';
import { useStore } from './context/StoreContext';
import { useDebounce } from './hooks/useDebounce';
import type { Product, View, AuthResponse } from '@/types';
import { applyPreferences, cachedPreferences } from './utils/preferences';

export default function StoreApp() {
  // Get everything from context
  const {
    token,
    authReady,
    user,
    cart,
    wishlist,
    compare,
    products,
    notification,
    showNotification,
    hideNotification,
    login,
    updateUser,
    addToCart,
    removeFromCart,
    changeQuantity,
    toggleWishlist,
    toggleCompare,
    clearCart,
    logout,
  } = useStore();

  // Local state (UI only)
  const [view, setView] = useState<View>('home');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Product | null>(null);
  const [finderResults, setFinderResults] = useState<Product[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const viewHistory = useRef<View[]>([]);
  const [sessionRestored, setSessionRestored] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const isAuthenticated = token && Boolean(user);

  useEffect(() => {
    applyPreferences(cachedPreferences());
  }, []);

  useEffect(() => {
    if (isAuthenticated && !sessionRestored) {
      queueMicrotask(() => {
        setSessionRestored(true);
        setSidebarCollapsed(false);
        setView('admin');
        viewHistory.current = [];
      });
    }
  }, [isAuthenticated, sessionRestored]);

  // Calculate categories
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(
        products
          .map((p) => p.category?.name)
          .filter(Boolean) as string[]
      )
    );
    return ['All', ...cats];
  }, [products]);

  // Filter products based on query and category
  const visibleProducts = useMemo(() => {
    return products.filter(
      (p) =>
        (category === 'All' || p.category?.name === category) &&
        `${p.name} ${p.brand?.name}`
          .toLowerCase()
          .includes(debouncedQuery.toLowerCase())
    );
  }, [products, category, debouncedQuery]);

  // Navigation logic
  const navigate = (next: View) => {
    if (!isAuthenticated && ['admin', 'settings'].includes(next)) {
      if (view !== 'account') viewHistory.current.push(view);
      setView('account');
      setMenuOpen(false);
      showNotification('Sign in to continue');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (next !== view) viewHistory.current.push(view);
    setView(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    let previous = viewHistory.current.pop();
    while (
      previous &&
      !isAuthenticated &&
      (['admin', 'settings'] as View[]).includes(previous)
    ) {
      previous = viewHistory.current.pop();
    }
    setView(previous || (isAuthenticated ? 'admin' : 'home'));
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    setView('home');
    setMenuOpen(false);
    setSidebarCollapsed(false);
    setSessionRestored(false);
    viewHistory.current = [];
    showNotification('You have signed out');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await logout();
  };

  const handleLogin = (data: AuthResponse) => {
    login(data);
    setSessionRestored(true);
    setView('admin');
    setMenuOpen(false);
    setSidebarCollapsed(false);
    viewHistory.current = [];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const withSidebar = (content: React.ReactNode) =>
    isAuthenticated && user ? (
      <DashboardShell user={user} view={view} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(value => !value)} onNavigate={navigate} onLogout={handleLogout}>
        {content}
      </DashboardShell>
    ) : content;

  if (!authReady || (isAuthenticated && !sessionRestored)) {
    return <main className="session-loading" aria-label="Restoring your session" />;
  }

  return (
    <ErrorBoundary>
      <main>
        {notification && (
          <Toast
            message={notification}
            onClose={hideNotification}
          />
        )}

        <Navigation
          view={view}
          isAuthenticated={isAuthenticated}
          cartCount={cart.length}
          onMenuToggle={() => setMenuOpen(!menuOpen)}
          onBrandClick={() => navigate('home')}
          onNavClick={(v) => navigate(v as View)}
          onSignIn={() => navigate(isAuthenticated ? 'admin' : 'account')}
          onCart={() => navigate('cart')}
          onLogout={handleLogout}
          menuOpen={menuOpen}
        />

        {!isAuthenticated && view !== 'home' && view !== 'admin' && (
          <div className="page-controls shell">
            <button onClick={goBack} aria-label="Go back">
              ← Back
            </button>
            <button
              onClick={() => navigate(isAuthenticated ? 'admin' : 'home')}
              aria-label="Go home"
            >
              ⌂ Home
            </button>
            {token && (
              <button
                className="control-logout"
                onClick={handleLogout}
                aria-label="Sign out"
              >
                Logout
              </button>
            )}
          </div>
        )}

        {view === 'home' && (
          <Home
            onShopClick={() => navigate('shop')}
            onFinderClick={() => navigate('finder')}
            onCompareClick={() => navigate('compare')}
            onServicesClick={() => navigate('services')}
          />
        )}

        {view === 'shop' && withSidebar(
          <Shop
            products={visibleProducts}
            categories={categories}
            category={category}
            onCategoryChange={setCategory}
            query={query}
            onQueryChange={setQuery}
            onSelect={setSelected}
            onAdd={addToCart}
            onWish={toggleWishlist}
            wishlist={wishlist}
            onCompare={toggleCompare}
          />
        )}

        {view === 'cart' && withSidebar(
          <Cart
            products={cart}
            onRemove={removeFromCart}
            onChangeQuantity={changeQuantity}
            onNavigate={navigate}
            isAuthenticated={isAuthenticated}
            onCheckout={() => {
              if (!isAuthenticated) {
                showNotification('Sign in to continue to checkout');
                navigate('account');
              } else {
                showNotification('Cart ready — add a delivery address to checkout');
              }
            }}
            onContinueShopping={() => navigate('shop')}
            onOrderComplete={clearCart}
          />
        )}

        {view === 'compare' && withSidebar(
          <Compare
            products={compare}
            allProducts={products}
            onToggle={toggleCompare}
          />
        )}

        {view === 'finder' && withSidebar(
          <Finder
            results={finderResults}
            products={products}
            onResultsChange={setFinderResults}
            onSelect={setSelected}
          />
        )}

        {view === 'assistant' && withSidebar(
          <Assistant products={products} onNavigate={navigate} onAdd={addToCart} onSelect={setSelected} />
        )}

        {view === 'feedback' && withSidebar(
          <Feedback user={user} onNotification={showNotification} />
        )}

        {view === 'services' && withSidebar(
          <Services
            isAuthenticated={isAuthenticated}
            onNotification={showNotification}
          />
        )}

        {view === 'account' && withSidebar(
          <Account
            user={user}
            token={isAuthenticated}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onNotification={showNotification}
            onUserUpdate={updateUser}
          />
        )}

        {view === 'settings' && withSidebar(
          <Settings onNotification={showNotification} />
        )}

        {view === 'admin' && user && (
          <DashboardShell user={user} view={view} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(value => !value)} onNavigate={navigate} onLogout={handleLogout}>
            <Dashboard user={user} cartCount={cart.length} wishlistCount={wishlist.length} compareCount={compare.length} onNavigate={navigate} />
          </DashboardShell>
        )}

        {selected && (
          <ProductDialog
            product={selected}
            onClose={() => setSelected(null)}
            onAdd={addToCart}
            onWish={toggleWishlist}
            onCompare={toggleCompare}
          />
        )}

        <Footer
          onNavigate={(v) => navigate(v as View)}
          onRequestLogin={() => navigate('account')}
        />
      </main>
    </ErrorBoundary>
  );
}
