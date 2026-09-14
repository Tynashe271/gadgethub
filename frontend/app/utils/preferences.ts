import { api } from './apiClient';

export type Theme = 'dark' | 'light' | 'system';
export type Language = 'en' | 'sn' | 'nd';
export type TextSize = 'standard' | 'large';
export type Preferences = { language: Language; theme: Theme; textSize: TextSize; orderUpdates: boolean; offers: boolean; compactDashboard: boolean; reducedMotion: boolean; dataSaver: boolean; };

export const defaultPreferences: Preferences = { language: 'en', theme: 'dark', textSize: 'standard', orderUpdates: true, offers: false, compactDashboard: false, reducedMotion: false, dataSaver: false };

export function applyPreferences(value: Preferences) {
  const root = document.documentElement;
  root.lang = value.language;
  root.dataset.theme = value.theme;
  root.dataset.textSize = value.textSize;
  root.dataset.compactDashboard = String(value.compactDashboard);
  root.dataset.reducedMotion = String(value.reducedMotion);
  root.dataset.dataSaver = String(value.dataSaver);
  window.localStorage.setItem('gh_preferences', JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('gh-language-change', { detail: value.language }));
}

export function cachedPreferences(): Preferences {
  try { return { ...defaultPreferences, ...JSON.parse(window.localStorage.getItem('gh_preferences') || '{}') }; }
  catch { return defaultPreferences; }
}

export async function loadPreferences(): Promise<Preferences> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('gh_token') : null;
  if (token?.startsWith('demo-session-')) {
    const preferences = cachedPreferences();
    applyPreferences(preferences);
    return preferences;
  }
  const saved = await api<Preferences>('/profile/settings');
  const preferences = { ...defaultPreferences, ...saved };
  applyPreferences(preferences);
  return preferences;
}

export async function savePreferences(value: Preferences) {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('gh_token') : null;
  if (token?.startsWith('demo-session-')) {
    applyPreferences(value);
    return value;
  }
  const saved = await api<Preferences>('/profile/settings', { method: 'PUT', body: JSON.stringify(value) });
  applyPreferences({ ...defaultPreferences, ...saved });
  return saved;
}
