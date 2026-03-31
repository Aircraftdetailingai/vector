"use client";
import { useEffect } from 'react';
import { applyFullTheme } from '@/lib/theme';

const DEFAULT_COLOR = '#007CB1';

/**
 * Global theme initializer — applies on every page load.
 * 1. Instant apply from localStorage cache (prevents flash)
 * 2. Always fetch fresh from server and re-apply
 * 3. Update localStorage cache for next load
 */
export default function ThemeInit() {
  useEffect(() => {
    // 1. Instant apply from localStorage (no network, no flash)
    try {
      const stored = localStorage.getItem('vector_user');
      if (stored) {
        const u = JSON.parse(stored);
        applyFullTheme(u.portal_theme || 'dark', u.theme_primary || DEFAULT_COLOR);
      } else {
        applyFullTheme('dark', DEFAULT_COLOR);
      }
    } catch {
      applyFullTheme('dark', DEFAULT_COLOR);
    }

    // 2. Always fetch fresh from server (source of truth)
    const token = localStorage.getItem('vector_token');
    if (token) {
      fetch('/api/user/branding', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          const mode = data.portal_theme || 'dark';
          const primary = data.theme_primary || DEFAULT_COLOR;
          applyFullTheme(mode, primary);
          // Update localStorage cache
          try {
            const u = JSON.parse(localStorage.getItem('vector_user') || '{}');
            u.theme_primary = primary;
            u.portal_theme = mode;
            u.theme_logo_url = data.theme_logo_url || data.logo_url || null;
            localStorage.setItem('vector_user', JSON.stringify(u));
          } catch {}
        })
        .catch(() => {}); // On network failure, keep localStorage cache applied
    }
  }, []);

  return null;
}
