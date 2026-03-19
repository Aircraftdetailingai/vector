"use client";
import { useState, useEffect, useCallback } from 'react';

export default function KeyboardShortcuts() {
  const [gPressed, setGPressed] = useState(false);
  const [gTimer, setGTimer] = useState(null);

  const isInputFocused = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + N -> New Quote
      if (meta && e.key === 'n') {
        e.preventDefault();
        window.location.href = '/dashboard';
        return;
      }

      // Cmd/Ctrl + S -> Save (dispatch custom event for forms to listen to)
      if (meta && e.key === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('vector:save'));
        return;
      }

      // Don't process single-key shortcuts when typing in an input
      if (isInputFocused()) return;

      // G + key navigation (vim-style)
      if (e.key === 'g' && !gPressed) {
        setGPressed(true);
        const timer = setTimeout(() => setGPressed(false), 800);
        setGTimer(timer);
        return;
      }

      if (gPressed) {
        setGPressed(false);
        if (gTimer) clearTimeout(gTimer);

        const routes = {
          d: '/dashboard',
          q: '/quotes',
          c: '/calendar',
          s: '/settings',
          h: '/help',
          t: '/team',
          a: '/admin/aircraft',
        };
        const route = routes[e.key];
        if (route) {
          e.preventDefault();
          window.location.href = route;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [gPressed, gTimer, isInputFocused]);

  return null;
}
