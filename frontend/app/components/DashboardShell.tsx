'use client';

import { ReactNode } from 'react';
import type { User, View } from '@/types';

interface Props { user: User; view: View; children: ReactNode; collapsed: boolean; onToggle: () => void; onNavigate: (view: View) => void; onLogout: () => void; }

export function DashboardShell({ user, view, children, collapsed, onToggle, onNavigate, onLogout }: Props) {
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
  const links: Array<[string, string, View]> = [
    ['⚙', 'Settings', 'settings'],
    ['⌂', 'Overview', 'admin'], ['▦', 'Shop', 'shop'], ['⌕', 'Phone Finder', 'finder'],
    ['⇄', 'Compare', 'compare'], ['🛠', 'Services', 'services'], ['▣', 'Cart', 'cart'], ['⚙', 'Account', 'account'], ['✦', 'AI Assistant', 'assistant'], ['★', 'Rate Us', 'feedback'],
  ];
  return (
    <section className={`dashboard${collapsed ? ' collapsed' : ''}`}>
      <aside className="dash-sidebar">
        <div className="dash-title"><button className="dash-logo" onClick={onToggle} aria-label={collapsed ? 'Open GadgetHub sidebar' : 'Close GadgetHub sidebar'} title={collapsed ? 'Open sidebar' : 'Close sidebar'}>G/H</button><span>MY GADGETHUB</span></div>
        <div className="dash-user"><i>{user.avatarUrl ? <img src={user.avatarUrl} alt={`${user.firstName}'s profile`} /> : initials || 'U'}</i><span><b>{user.firstName} {user.lastName}</b><small>{user.email}</small></span></div>
        <button className="sidebar-logout" onClick={onLogout} aria-label="Log out"><i>↪</i><span>Log out</span></button>
        <nav aria-label="Account dashboard">
          {links.map(([icon, label, destination]) => <button key={label} className={view === destination ? 'active' : ''} onClick={() => onNavigate(destination)} title={collapsed ? label : undefined}><i>{icon}</i><span>{label}</span></button>)}
        </nav>
        <button className="dash-shop" onClick={onLogout}><i>↪</i><span>Sign out</span></button>
      </aside>
      <div className="dash-content">{children}</div>
    </section>
  );
}
