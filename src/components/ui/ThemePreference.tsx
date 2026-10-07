"use client";

import { useEffect, useState } from 'react';
import { ThemeSwitch, type Theme } from '../arc/theme-switch/theme-switch';

type Preference = 'system' | Theme;

function resolveTheme(preference: Preference): Theme {
  if (preference !== 'system') return preference;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyPreference(preference: Preference) {
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolveTheme(preference);
}

export default function ThemePreference() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem('cs101:theme'); } catch {}
    const initial: Preference = stored === 'light' || stored === 'dark' ? stored : 'system';
    setTheme(resolveTheme(initial));
    applyPreference(initial);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => {
      if (document.documentElement.dataset.themePreference === 'system') {
        const next = media.matches ? 'dark' : 'light';
        setTheme(next);
        document.documentElement.dataset.theme = next;
      }
    };
    media.addEventListener('change', syncSystemTheme);
    return () => media.removeEventListener('change', syncSystemTheme);
  }, []);

  const changeTheme = (next: Theme) => {
    setTheme(next);
    applyPreference(next);
    try { localStorage.setItem('cs101:theme', next); } catch {}
  };

  return <ThemeSwitch
    theme={theme}
    variant="eclipse"
    iconOnly
    label={theme === 'light' ? 'Aktifkan tema gelap' : 'Aktifkan tema terang'}
    onThemeChange={changeTheme}
  />;
}
