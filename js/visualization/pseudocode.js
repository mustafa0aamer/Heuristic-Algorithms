// js/visualization/pseudocode.js
// Manages the pseudocode panel: populates lines, highlights the active line,
// injects live variable values into {placeholder} tokens.

import { fmt } from '../utils/ui.js';

let _lines     = [];   // Raw PSEUDOCODE array from current algorithm
let _listEl    = null; // <ol id="pseudocode-list">
let _lineEls   = [];   // Rendered <li> elements

/**
 * Initialize (or re-initialize) the pseudocode panel with a new algorithm's lines.
 * @param {string[]} pseudocodeLines  e.g., PSEUDOCODE from hillClimbing.js
 */
export function initPseudocode(pseudocodeLines) {
  _lines  = pseudocodeLines;
  _listEl = document.getElementById('pseudocode-list');
  if (!_listEl) return;

  _listEl.innerHTML = '';
  _lineEls = [];

  pseudocodeLines.forEach((line, i) => {
    const li = document.createElement('li');
    li.className = 'pc-line';
    li.dataset.index = i;

    if (line === '') {
      li.className += ' pc-line--spacer';
      li.innerHTML  = '&nbsp;';
    } else if (line.startsWith('──') || line.startsWith('//')) {
      li.className += ' pc-line--comment';
      li.textContent = line;
    } else {
      li.className += ' pc-line--code';
      li.innerHTML   = _tokenize(line);
    }

    _listEl.appendChild(li);
    _lineEls.push(li);
  });
}

/**
 * Update the panel for the current step: highlight line + inject live values.
 * @param {number} activeLine   0-based index of the line to highlight
 * @param {object} variables    Variable snapshot from StepObject.variables
 */
export function updatePseudocode(activeLine, variables) {
  if (!_listEl || !_lineEls.length) return;

  _lineEls.forEach((li, i) => {
    const wasActive = li.classList.contains('pc-line--active');
    const isActive  = i === activeLine;

    li.classList.toggle('pc-line--active',   isActive);
    li.classList.toggle('pc-line--previous', wasActive && !isActive);

    // Inject live values into code lines
    if (li.classList.contains('pc-line--code') && variables) {
      li.innerHTML = _tokenize(_injectValues(_lines[i], variables));
    }
  });

  // Scroll active line into view
  if (_lineEls[activeLine]) {
    _lineEls[activeLine].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

export function updateVarsPanel(variables) {
  const grid = document.getElementById('vars-grid');
  if (!variables || !grid) return;

  grid.innerHTML = '';
  
  const format = (v) => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'number') return isNaN(v) ? 'NaN' : fmt(v, 4);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  };

  const accentKeys = ['best_val', 'best f(x)'];

  for (const [key, rawValue] of Object.entries(variables)) {
    if (key === 'compare_op' || key === 'accepted' || key === 'numCandidates' || key === 'learningRate') continue;
    
    let displayKey = key.replace(/_/g, ' ');
    if (displayKey === 'current val') displayKey = 'f(current x)';
    if (displayKey === 'neighbor val') displayKey = 'f(neighbor x)';
    if (displayKey === 'best val') displayKey = 'best f(x)';
    
    const row = document.createElement('div');
    row.className = 'var-row';
    if (accentKeys.includes(key) || displayKey === 'best f(x)') row.classList.add('accent');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'var-name';
    nameSpan.textContent = displayKey;

    const valSpan = document.createElement('span');
    valSpan.className = 'var-val';
    valSpan.textContent = format(rawValue);

    row.appendChild(nameSpan);
    row.appendChild(valSpan);
    grid.appendChild(row);
  }
}

/** Update the annotation box text */
export function updateAnnotation(text) {
  const el = document.getElementById('annotation-text');
  if (el) el.textContent = text || '';
}

/** Reset panel to initial blank state */
export function resetPseudocode() {
  _lineEls.forEach(li => {
    li.classList.remove('pc-line--active', 'pc-line--previous');
    if (li.classList.contains('pc-line--code')) {
      const i = parseInt(li.dataset.index ?? '0');
      li.innerHTML = _tokenize(_lines[i] || '');
    }
  });
  updateVarsPanel({
    current_x: null, current_val: null,
    best_x: null, best_val: null, iteration: null,
  });
  updateAnnotation('Initialize to begin...');
}

// ── Private ────────────────────────────────────────────────────────────────────

function _setVar(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * Replace {variable_name} tokens with live values from variables map.
 */
function _injectValues(template, variables) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = variables[key];
    if (v === null || v === undefined) return `{${key}}`;
    return typeof v === 'number' ? fmt(v, 4) : String(v);
  });
}

/**
 * Wrap keywords and identifiers in <span> elements for syntax coloring.
 */
function _tokenize(line) {
  // Escape HTML first
  let html = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Keywords
  html = html.replace(
    /\b(REPEAT|RETURN|IF|THEN|ELSE|STOP|until)\b/g,
    '<span class="pc-kw">$1</span>'
  );
  // Arrows
  html = html.replace(/(←)/g, '<span class="pc-arrow">$1</span>');
  // Numbers
  html = html.replace(/\b(-?\d+\.?\d*)\b/g, '<span class="pc-num">$1</span>');
  // Function calls
  html = html.replace(/\b([a-z_][a-z0-9_]*)\(/gi, '<span class="pc-fn">$1</span>(');
  // Variable names that were injected (wrapped identifiers)
  html = html.replace(/\b(current_x|current_val|neighbor_x|neighbor_val|best_x|best_val|iteration|slope|step_size|learningRate)\b/g,
    '<span class="pc-var">$1</span>');
  // Comparison operators (match HTML-escaped < > entities as strings)
  html = html.replace(/(&lt;=?|&gt;=?|==)/g, '<span class="pc-op">$1</span>');

  return html;
}
