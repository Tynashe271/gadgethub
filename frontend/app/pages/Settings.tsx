'use client';

import { useEffect, useRef, useState } from 'react';
import { applyPreferences, cachedPreferences, loadPreferences, savePreferences, type Language, type Preferences, type TextSize, type Theme } from '../utils/preferences';
import { useLanguage } from '../hooks/useLanguage';

interface SettingsProps { onNotification: (message: string) => void; }

export function Settings({ onNotification }: SettingsProps) {
  const { t } = useLanguage();
  const [preferences, setPreferences] = useState<Preferences>(cachedPreferences);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadPreferences()
      .then((saved) => setPreferences(saved))
      .catch(() => onNotification('Could not load saved settings'))
      .finally(() => setLoaded(true));
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [onNotification]);

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    applyPreferences(next);
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void savePreferences(next)
        .then((saved) => setPreferences({ ...next, ...saved }))
        .catch(() => onNotification('Setting could not be saved'))
        .finally(() => setSaving(false));
    }, 350);
  };

  return <section className="settings-page page shell">
    <span className="kicker">PREFERENCES</span><h2>Account <em>settings.</em></h2>
    <p className="dash-lead">Your preferences are saved to your GadgetHub account and follow you across devices.</p>
    <div className="settings-save-state" role="status">{!loaded ? 'Loading settings…' : saving ? 'Saving changes…' : 'All changes saved'}</div>
    <div className="settings-panel" aria-busy={!loaded}>
      <SettingsGroup title={t('languageAppearance', 'Language & appearance')}>
        <SelectSetting label={t('language', 'Language')} description={t('languageDesc', 'Choose your preferred GadgetHub language.')} value={preferences.language} onChange={(value) => update('language', value as Language)} options={[["en", "English"], ["sn", "Shona"], ["nd", "Ndebele"]]} />
        <SelectSetting label={t('theme', 'Theme')} description="Use dark, light, or your device appearance." value={preferences.theme} onChange={(value) => update('theme', value as Theme)} options={[["dark", "Dark"], ["light", "Light"], ["system", "Device setting"]]} />
        <SelectSetting label={t('textSize', 'Text size')} description="Increase interface text for easier reading." value={preferences.textSize} onChange={(value) => update('textSize', value as TextSize)} options={[["standard", "Standard"], ["large", "Large"]]} />
        <ToggleSetting label={t('compact', 'Compact dashboard')} description="Reduce spacing so more account information fits on screen." checked={preferences.compactDashboard} onChange={(value) => update('compactDashboard', value)} />
        <ToggleSetting label={t('motion', 'Reduce motion')} description="Limit animations and smooth scrolling throughout the app." checked={preferences.reducedMotion} onChange={(value) => update('reducedMotion', value)} />
      </SettingsGroup>
      <SettingsGroup title={t('notifications', 'Notifications')}>
        <ToggleSetting label="Order and service updates" description="Receive progress updates for orders, repairs and trade-ins." checked={preferences.orderUpdates} onChange={(value) => update('orderUpdates', value)} />
        <ToggleSetting label="Offers and new arrivals" description="Hear about relevant product launches and GadgetHub promotions." checked={preferences.offers} onChange={(value) => update('offers', value)} />
      </SettingsGroup>
      <SettingsGroup title={t('dataPrivacy', 'Data & privacy')}>
        <ToggleSetting label="Data saver" description="Prefer fewer large product images when browsing on mobile data." checked={preferences.dataSaver} onChange={(value) => update('dataSaver', value)} />
      </SettingsGroup>
    </div>
  </section>;
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) { return <fieldset className="settings-group"><legend>{title}</legend>{children}</fieldset>; }
function ToggleSetting({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="setting-row"><span><b>{label}</b><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>; }
function SelectSetting({ label, description, value, onChange, options }: { label: string; description: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) { return <label className="setting-row select-setting"><span><b>{label}</b><small>{description}</small></span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>; }
