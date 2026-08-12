'use client';

import { useState, useEffect, useCallback } from 'react';

// Site-wide theme. Applies data-theme="dark" on <html>, persists to localStorage.
// The pre-paint script in layout.js sets the initial value to avoid a flash.
export function useTheme() {
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    try {
      const attr = document.documentElement.getAttribute('data-theme');
      setThemeState(attr === 'dark' ? 'dark' : 'light');
    } catch (e) {}
  }, []);

  const setTheme = useCallback((next) => {
    try {
      if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('kdu_theme', next);
    } catch (e) {}
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
