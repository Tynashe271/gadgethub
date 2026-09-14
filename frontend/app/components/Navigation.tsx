// app/components/Navigation.tsx
'use client';
import { useLanguage } from '../hooks/useLanguage';

interface NavigationProps {
  view: string;
  isAuthenticated: boolean;
  cartCount: number;
  onMenuToggle: () => void;
  onBrandClick: () => void;
  onNavClick: (view: string) => void;
  onSignIn: () => void;
  onCart: () => void;
  onLogout: () => void;
  menuOpen: boolean;
}

export function Navigation({
  view,
  isAuthenticated,
  cartCount,
  onMenuToggle,
  onBrandClick,
  onNavClick,
  onSignIn,
  onCart,
  onLogout,
  menuOpen,
}: NavigationProps) {
  const { t } = useLanguage();
  return (
    <header className="nav shell">
      <button 
        className="brand-button" 
        onClick={onBrandClick}
        aria-label={isAuthenticated ? 'Open GadgetHub dashboard' : 'GadgetHub Home'}
      >
        GADGET<span>HUB</span>
      </button>
      <button 
        className="menu" 
        onClick={onMenuToggle}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        ☰
      </button>
      <nav className={menuOpen ? 'open' : ''}>
        {[
          [t('shop', 'Shop'), 'shop'],
          [t('finder', 'Phone Finder'), 'finder'],
          [t('assistant', 'AI Assistant'), 'assistant'],
          [t('feedback', 'Rate Us'), 'feedback'],
          [t('compare', 'Compare'), 'compare'],
          [t('services', 'Services'), 'services'],
        ].map(([label, key]) => (
          <button
            className={view === key ? 'active' : ''}
            onClick={() => onNavClick(key)}
            key={key}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="nav-actions">
        <button onClick={onSignIn} aria-label={isAuthenticated ? 'Dashboard' : 'Sign in'}>
          {isAuthenticated ? t('dashboard', 'Dashboard') : t('signIn', 'Sign in')}
        </button>
        <button onClick={onCart} aria-label={`Cart with ${cartCount} items`}>
          {t('cart', 'Cart')} <b>{cartCount}</b>
        </button>
        {isAuthenticated && (
          <button className="nav-logout" onClick={onLogout} aria-label="Log out">
            {t('logout', 'Log out')}
          </button>
        )}
      </div>
    </header>
  );
}
