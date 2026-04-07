// js/utils/theme.js
// Handles dark/light mode toggle, persisted to localStorage.

import { getState, setState } from '../state.js';

const STORAGE_KEY = 'heuristic-theme';

/** Initialize theme from localStorage or system preference. */
export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

/** Toggle between light and dark theme. */
export function toggleTheme() {
  const { theme } = getState();
  applyTheme(theme === 'light' ? 'dark' : 'light');
}

/** Apply a specific theme and persist it. */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  setState({ theme });
  localStorage.setItem(STORAGE_KEY, theme);
  updateToggleButton(theme);
}

function updateToggleButton(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const icon = btn.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'light' ? '🌙' : '☀️';
  btn.title = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`;
}
