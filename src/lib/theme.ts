/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ThemeConfig {
  mode: 'dark' | 'light';
  primary: string;
  secondary: string;
}

export const DEFAULT_THEME: ThemeConfig = {
  mode: 'dark',
  primary: '#fbbf24',
  secondary: '#6366f1',
};

// Helper to adjust hex color brightness
export function adjustColorBrightness(hex: string, percent: number): string {
  try {
    const raw = hex.replace('#', '');
    const num = parseInt(raw, 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;

    const rLimited = Math.max(0, Math.min(255, R));
    const gLimited = Math.max(0, Math.min(255, G));
    const bLimited = Math.max(0, Math.min(255, B));

    return '#' + (
      0x1000000 +
      rLimited * 0x10000 +
      gLimited * 0x100 +
      bLimited
    ).toString(16).slice(1);
  } catch (e) {
    return hex;
  }
}

export function getThemeSettings(): ThemeConfig {
  try {
    const mode = localStorage.getItem('app_theme_mode') as 'dark' | 'light' || 'dark';
    const primary = localStorage.getItem('app_theme_primary') || '#fbbf24';
    const secondary = localStorage.getItem('app_theme_secondary') || '#6366f1';
    return { mode, primary, secondary };
  } catch (e) {
    return DEFAULT_THEME;
  }
}

export function saveThemeSettings(config: Partial<ThemeConfig>) {
  try {
    if (config.mode) localStorage.setItem('app_theme_mode', config.mode);
    if (config.primary) localStorage.setItem('app_theme_primary', config.primary);
    if (config.secondary) localStorage.setItem('app_theme_secondary', config.secondary);
  } catch (e) {
    console.error('Failed to save theme settings to localStorage:', e);
  }
}

export function applyTheme(config: ThemeConfig) {
  try {
    const root = document.documentElement;

    // 1. Toggle dark/light class
    if (config.mode === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }

    // 2. Set style properties
    root.style.setProperty('--primary-color', config.primary);
    root.style.setProperty('--primary-light', adjustColorBrightness(config.primary, 0.2));
    root.style.setProperty('--primary-dark', adjustColorBrightness(config.primary, -0.15));
    root.style.setProperty('--primary-dark-extra', adjustColorBrightness(config.primary, -0.3));

    root.style.setProperty('--secondary-color', config.secondary);
    root.style.setProperty('--secondary-light', adjustColorBrightness(config.secondary, 0.2));
    root.style.setProperty('--secondary-dark', adjustColorBrightness(config.secondary, -0.15));
  } catch (e) {
    console.error('Failed to apply theme config:', e);
  }
}
