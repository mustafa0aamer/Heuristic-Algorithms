// js/utils/ui.js
// Shared UI helper utilities: formatting, toasts, debounce, etc.

/**
 * Debounce: delays fn execution until after `delay` ms have passed
 * since the last call. Useful for live-input validation.
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Format a number for display with fixed decimals.
 * Returns '—' for null/undefined.
 */
export function fmt(val, decimals = 4) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? '✓ Yes' : '✗ No';
  if (typeof val !== 'number' || !isFinite(val)) return String(val);
  // Trim trailing zeros
  return parseFloat(val.toFixed(decimals)).toString();
}

/**
 * Show a transient toast notification.
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} type
 * @param {number} duration ms
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger CSS transition
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast--visible')));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}

/**
 * Clamp a number to [min, max].
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Map a speed slider value (ms/step) to a human-readable label.
 */
export function speedLabel(ms) {
  if (ms <= 150)  return 'Fast ×4';
  if (ms <= 350)  return 'Fast ×2';
  if (ms <= 700)  return 'Normal';
  if (ms <= 1200) return 'Slow ×0.5';
  return 'Very Slow';
}

/**
 * Set the text content of an element by ID safely.
 */
export function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '—';
}

/**
 * Toggle a CSS class on an element.
 */
export function toggleClass(el, cls, force) {
  if (el) el.classList.toggle(cls, force);
}
