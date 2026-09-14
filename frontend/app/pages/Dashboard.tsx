'use client';

import type { User, View } from '@/types';
import { useLanguage } from '../hooks/useLanguage';

interface Props { user: User; cartCount: number; wishlistCount: number; compareCount: number; onNavigate: (view: View) => void; }

export function Dashboard({ user, cartCount, wishlistCount, compareCount, onNavigate }: Props) {
  const { t } = useLanguage();
  return (
    <div className="dashboard-overview">
      <header><div><span className="kicker">{t('overview', 'ACCOUNT OVERVIEW')}</span><h1>{t('yourDashboard', 'Your dashboard')}</h1></div><button onClick={() => onNavigate('shop')}>{t('continueShopping', 'Continue shopping')}</button></header>
      <div className="dash-welcome"><div><span className="kicker">{t('welcome', 'WELCOME BACK')}</span><h2>{t('hello', 'Hello')}, {user.firstName}.</h2><p>{t('manage', 'Manage your shopping, saved devices, services and rewards.')}</p></div><b>{user.loyaltyPoints || 0}<small>LOYALTY POINTS</small></b></div>
      <div className="dash-stats">
        <article onClick={() => onNavigate('cart')}><small>CART</small><b>{cartCount}</b><span>Items ready to review</span></article>
        <article onClick={() => onNavigate('shop')}><small>WISHLIST</small><b>{wishlistCount}</b><span>Saved products</span></article>
        <article onClick={() => onNavigate('compare')}><small>COMPARE</small><b>{compareCount}</b><span>Devices selected</span></article>
      </div>
      <div className="dash-actions"><h2>Quick actions</h2><div>
        <button onClick={() => onNavigate('assistant')}>✦<span>AI Assistant<small>Get personalized buying advice</small></span></button>
        <button onClick={() => onNavigate('finder')}>⌕<span>Phone Finder<small>Find your ideal device</small></span></button>
        <button onClick={() => onNavigate('services')}>🛠<span>Get support<small>Repairs, trade-ins and help</small></span></button>
        <button onClick={() => onNavigate('cart')}>▣<span>View cart<small>Review and check out</small></span></button>
      </div></div>
    </div>
  );
}
