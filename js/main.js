// js/main.js
// Application bootstrap and orchestrator.
// Wires all modules together, binds DOM events, manages playback.

import { getState, setState, subscribe }    from './state.js';
import { initTheme, toggleTheme }           from './utils/theme.js';
import { debounce, showToast, fmt, speedLabel, setText, toggleClass } from './utils/ui.js';
import { validateExpression, sampleValueRange } from './utils/mathParser.js';
import { OBJECTIVE_FUNCTIONS, getObjectiveById, getRandomObjective }  from './functions/objective.js';
import { NEIGHBORHOOD_FUNCTIONS, getNeighborhoodById, getRandomNeighborhood } from './functions/neighborhood.js';
import { ALGORITHM_REGISTRY }               from './algorithms/index.js';
import { CanvasRenderer }                   from './visualization/canvas.js';
import { initPseudocode, updatePseudocode, updateVarsPanel, updateAnnotation, resetPseudocode } from './visualization/pseudocode.js';

// ── Module-level refs ──────────────────────────────────────────────────────────
let renderer   = null;
let algoModule = null;
let stepGen    = null;   // Live generator (lazy step production)
let playTimer  = null;
let algoParams = {};     // Holds current values for algorithm-specific parameters

// ── Entry Point ────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  buildUI();
  bindEvents();
  selectAlgorithm('hillClimbing');
  applyDefaults();
});

// ── UI Construction ────────────────────────────────────────────────────────────

function buildUI() {
  // Canvas
  const canvas = document.getElementById('main-canvas');
  renderer = new CanvasRenderer(canvas);

  // Populate objective function dropdown
  const objSel = document.getElementById('obj-fn-select');
  OBJECTIVE_FUNCTIONS.forEach(fn => {
    const opt = document.createElement('option');
    opt.value       = fn.id;
    opt.textContent = fn.name;
    objSel.appendChild(opt);
  });

  // Populate neighborhood function dropdown
  const nbrSel = document.getElementById('nbr-fn-select');
  NEIGHBORHOOD_FUNCTIONS.forEach(fn => {
    const opt = document.createElement('option');
    opt.value       = fn.id;
    opt.textContent = fn.name;
    nbrSel.appendChild(opt);
  });

  // Populate algorithm selector
  const algoSel = document.getElementById('algorithm-select');
  algoSel.innerHTML = '';
  Object.values(ALGORITHM_REGISTRY).forEach(algo => {
    const opt = document.createElement('option');
    opt.value       = algo.METADATA.id;
    opt.textContent = algo.METADATA.name;
    algoSel.appendChild(opt);
  });
}

function applyDefaults() {
  // Pick a random start function and neighborhood
  const rndObj = getRandomObjective();
  const rndNbr = getRandomNeighborhood();

  document.getElementById('obj-fn-select').value = rndObj.id;
  document.getElementById('nbr-fn-select').value = rndNbr.id;

  setObjectiveFunction(rndObj.id);
  setNeighborhoodFunction(rndNbr.id);
  updateDomain(rndObj.domain);
  updateModeUI('maximize');
}

// ── Event Bindings ─────────────────────────────────────────────────────────────

function bindEvents() {
  // Theme toggle
  document.getElementById('theme-toggle')
    .addEventListener('click', () => { toggleTheme(); renderer?.draw(); });

  // Algorithm selector
  document.getElementById('algorithm-select')
    .addEventListener('change', e => selectAlgorithm(e.target.value));

  // Mode toggle
  document.getElementById('mode-toggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    const mode = btn.dataset.mode;
    setState({ mode });
    updateModeUI(mode);
    resetExecution();
  });

  // Objective function
  document.getElementById('obj-fn-select').addEventListener('change', e => {
    if (!getState().useCustomObjective) setObjectiveFunction(e.target.value);
    resetExecution();
  });
  document.getElementById('random-obj-btn').addEventListener('click', () => {
    const fn = getRandomObjective();
    document.getElementById('obj-fn-select').value = fn.id;
    setObjectiveFunction(fn.id);
    resetExecution();
    showToast(`Function: ${fn.name}`, 'info', 2000);
  });
  document.getElementById('use-custom-obj').addEventListener('change', e => {
    setState({ useCustomObjective: e.target.checked });
    document.getElementById('custom-obj-section').classList.toggle('expandable--open', e.target.checked);
    if (!e.target.checked) setObjectiveFunction(document.getElementById('obj-fn-select').value);
    resetExecution();
  });
  document.getElementById('apply-obj-btn').addEventListener('click', applyCustomObjective);
  document.getElementById('custom-obj-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') applyCustomObjective();
  });

  // Neighborhood function
  document.getElementById('nbr-fn-select').addEventListener('change', e => {
    if (!getState().useCustomNeighbor) setNeighborhoodFunction(e.target.value);
    resetExecution();
  });
  document.getElementById('random-nbr-btn').addEventListener('click', () => {
    const fn = getRandomNeighborhood();
    document.getElementById('nbr-fn-select').value = fn.id;
    setNeighborhoodFunction(fn.id);
    resetExecution();
    showToast(`Neighbor: ${fn.name}`, 'info', 2000);
  });
  document.getElementById('use-custom-nbr').addEventListener('change', e => {
    setState({ useCustomNeighbor: e.target.checked });
    document.getElementById('custom-nbr-section').classList.toggle('expandable--open', e.target.checked);
    if (!e.target.checked) setNeighborhoodFunction(document.getElementById('nbr-fn-select').value);
    resetExecution();
  });
  document.getElementById('apply-nbr-btn').addEventListener('click', applyCustomNeighbor);
  document.getElementById('custom-nbr-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') applyCustomNeighbor();
  });

  // Domain inputs
  const debouncedDomain = debounce(() => {
    const min = parseFloat(document.getElementById('domain-min').value);
    const max = parseFloat(document.getElementById('domain-max').value);
    if (isFinite(min) && isFinite(max) && min < max) {
      setState({ domain: [min, max] });
      refreshCanvas();
      resetExecution();
    }
  }, 400);
  document.getElementById('domain-min').addEventListener('input', debouncedDomain);
  document.getElementById('domain-max').addEventListener('input', debouncedDomain);

  // Max iterations slider
  const iterSlider  = document.getElementById('max-iter-slider');
  const iterDisplay = document.getElementById('max-iter-display');
  iterSlider.addEventListener('input', () => {
    const v = parseInt(iterSlider.value);
    iterDisplay.textContent = v;
    setState({ maxIterations: v });
    resetExecution();
  });

  // Playback speed
  const speedSlider  = document.getElementById('speed-slider');
  const speedDisplay = document.getElementById('speed-display');
  speedSlider.addEventListener('input', () => {
    const ms = parseInt(speedSlider.value);
    speedDisplay.textContent = speedLabel(ms);
    setState({ playbackSpeed: ms });
    if (playTimer) { clearInterval(playTimer); playTimer = setInterval(stepForward, ms); }
  });

  // Control buttons
  document.getElementById('run-btn').addEventListener('click', toggleRun);
  document.getElementById('step-btn').addEventListener('click', stepForward);
  document.getElementById('reset-btn').addEventListener('click', resetExecution);

  // Panel toggles
  document.getElementById('pseudo-toggle').addEventListener('click', togglePseudocode);
  document.getElementById('controls-toggle').addEventListener('click', toggleControls);

  // Responsive canvas resize
  const ro = new ResizeObserver(() => renderer?.resize());
  ro.observe(document.getElementById('canvas-wrapper'));
}

// ── Algorithm Selection ────────────────────────────────────────────────────────

function selectAlgorithm(id) {
  algoModule = ALGORITHM_REGISTRY[id];
  if (!algoModule) return;
  setState({ algorithm: id });
  initPseudocode(algoModule.PSEUDOCODE);
  document.getElementById('pseudo-algo-name').textContent = algoModule.METADATA.name;
  
  // Set defaults and render UI
  algoParams = buildDefaultParams(algoModule.PARAMS || []);
  renderAlgoParams(algoModule);
  
  resetExecution();
}

// ── Function Setup ─────────────────────────────────────────────────────────────

function setObjectiveFunction(id) {
  const fn = getObjectiveById(id);
  if (!fn) return;
  setState({ objectiveFunction: fn });
  updateDomain(fn.domain);
  updateFnDisplay(fn.expression || fn.name);
  // Draw the curve immediately so the canvas isn't blank on load
  refreshCanvas();
}

function setNeighborhoodFunction(id) {
  const fn = getNeighborhoodById(id);
  if (!fn) return;
  setState({ neighborhoodFunction: fn, neighborParams: buildDefaultParams(fn.params) });
  renderNeighborParams(fn);
}

function buildDefaultParams(paramDefs = []) {
  const out = {};
  paramDefs.forEach(p => { out[p.id] = p.default; });
  return out;
}

function renderAlgoParams(algo) {
  const container = document.getElementById('algo-params-container');
  if (!container) return;
  container.innerHTML = '';
  
  (algo.PARAMS || []).forEach(p => {
    if (p.id === 'maxIterations') return; // Handled globally
    
    // Support toggleable config
    const wrap = document.createElement('div');
    wrap.className = 'param-row';
    wrap.innerHTML = `
      <div class="control-label-row mt-sm">
        <label class="control-sublabel" for="algo-param-${p.id}">${p.label}</label>
        <span class="value-badge" id="algo-param-display-${p.id}">${p.default}</span>
      </div>
      <input class="range-input" type="range" id="algo-param-${p.id}"
             min="${p.min}" max="${p.max}" step="${p.step}" value="${p.default}">
    `;
    container.appendChild(wrap);

    document.getElementById(`algo-param-${p.id}`).addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      document.getElementById(`algo-param-display-${p.id}`).textContent = val;
      algoParams[p.id] = val;
      resetExecution();
    });
  });
}

function renderNeighborParams(fn) {
  const container = document.getElementById('nbr-params-container');
  container.innerHTML = '';
  (fn.params || []).forEach(p => {
    const wrap = document.createElement('div');
    wrap.className = 'param-row';
    wrap.innerHTML = `
      <div class="control-label-row mt-sm">
        <label class="control-sublabel" for="param-${p.id}">${p.label}</label>
        <span class="value-badge" id="param-display-${p.id}">${p.default}</span>
      </div>
      <input class="range-input" type="range" id="param-${p.id}"
             min="${p.min}" max="${p.max}" step="${p.step}" value="${p.default}">
    `;
    container.appendChild(wrap);

    document.getElementById(`param-${p.id}`).addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      document.getElementById(`param-display-${p.id}`).textContent = val;
      const { neighborParams } = getState();
      setState({ neighborParams: { ...neighborParams, [p.id]: val } });
      resetExecution();
    });
  });
}

function applyCustomObjective() {
  const expr   = document.getElementById('custom-obj-input').value.trim();
  const status = document.getElementById('obj-status');
  if (!expr) return;

  const result = validateExpression(expr);
  if (!result.valid) {
    status.textContent = '✗ ' + result.error;
    status.className   = 'help-text help-text--error';
    return;
  }

  setState({ compiledObjectiveFn: result.fn, customObjectiveExpr: expr });
  updateFnDisplay(expr);
  const { domain } = getState();
  const vr = sampleValueRange(result.fn, domain);
  renderer?.setFunction(result.fn, domain);
  status.textContent = '✓ Applied!';
  status.className   = 'help-text help-text--success';
  resetExecution();
  showToast('Custom function applied!', 'success');
}

function applyCustomNeighbor() {
  const expr   = document.getElementById('custom-nbr-input').value.trim();
  const status = document.getElementById('nbr-status');
  if (!expr) return;

  // Wrap expression: user writes something using 'x', 'step', 'iter'
  try {
    if (typeof window.math === 'undefined') throw new Error('math.js not loaded');
    const compiled = window.math.compile(expr);
    const customFn = (x, params, domain, iter) => {
      const step = params.step_size || params.sigma || params.initial_step || 0.5;
      const result = compiled.evaluate({ x, step, iter, pi: Math.PI, e: Math.E,
        random: Math.random() });
      return Math.max(domain[0], Math.min(domain[1], isFinite(result) ? result : x));
    };
    setState({ compiledNeighborFn: customFn, customNeighborExpr: expr });
    status.textContent = '✓ Applied!';
    status.className   = 'help-text help-text--success';
    resetExecution();
    showToast('Custom neighbor function applied!', 'success');
  } catch (e) {
    status.textContent = '✗ ' + e.message;
    status.className   = 'help-text help-text--error';
  }
}

// ── Execution Control ──────────────────────────────────────────────────────────

function buildConfig() {
  const s = getState();
  const objFn = s.useCustomObjective && s.compiledObjectiveFn
    ? s.compiledObjectiveFn
    : (s.objectiveFunction?.fn ?? (x => x * x));

  const nbrDef = s.neighborhoodFunction;
  const nbrFn  = s.useCustomNeighbor && s.compiledNeighborFn
    ? s.compiledNeighborFn
    : (nbrDef ? nbrDef.fn : (x, _p, d) => Math.max(d[0], Math.min(d[1], x + (Math.random() - 0.5))));

  return {
    objectiveFn:    objFn,
    neighborFn:     nbrFn,
    mode:           s.mode,
    domain:         s.domain,
    params:         { ...algoParams, maxIterations: s.maxIterations },
    neighborParams: s.neighborParams,
  };
}

function initExecution() {
  if (!algoModule) return false;
  const config = buildConfig();

  // setFunction already clears trail + redraws; no extra reset() needed
  renderer?.setFunction(config.objectiveFn, config.domain);
  resetPseudocode();

  // Create fresh generator
  stepGen = algoModule.generateSteps(config);
  setState({ steps: [], currentStepIndex: -1, status: 'initialized', currentVars: {}, activePseudocodeLine: -1 });

  setButtonState('initialized');
  setText('stat-status', 'Ready');
  updateAnnotation('Press Step or Run to execute…');
  return true;
}

function stepForward() {
  if (getState().status === 'idle') {
    if (!initExecution()) return;
  }
  if (getState().status === 'converged') return;

  const result = stepGen.next();
  if (result.done) {
    setState({ status: 'converged' });
    setButtonState('converged');
    setText('stat-status', 'Converged');
    return;
  }

  const step = result.value;
  const { steps, currentStepIndex } = getState();
  steps.push(step);

  setState({
    steps,
    currentStepIndex: steps.length - 1,
    currentVars: step.variables,
    activePseudocodeLine: step.pseudocodeLine,
    status: getState().status === 'initialized' ? 'paused' : getState().status,
  });

  // Update visualizations
  renderer?.renderStep(step, getState().mode);
  updatePseudocode(step.pseudocodeLine, step.variables);
  updateVarsPanel(step.variables);
  updateAnnotation(step.annotation);
  updateStatsBar(step);

  if (step.type === 'converge') {
    stopPlay();
    setState({ status: 'converged' });
    setButtonState('converged');
    setText('stat-status', 'Converged ✓');
    showToast(step.annotation, 'success', 4000);
  }
}

function toggleRun() {
  const { status } = getState();
  if (status === 'running') {
    stopPlay();
  } else {
    startPlay();
  }
}

function startPlay() {
  const { status, playbackSpeed } = getState();
  if (status === 'converged') return;
  if (status === 'idle' || status === 'initialized') {
    if (!initExecution()) return;
  }
  setState({ status: 'running' });
  setButtonState('running');
  setText('stat-status', 'Running…');
  playTimer = setInterval(stepForward, playbackSpeed);
}

function stopPlay() {
  clearInterval(playTimer);
  playTimer = null;
  const { status } = getState();
  // Only transition to 'paused' if we were actively running
  if (status === 'running') {
    setState({ status: 'paused' });
    setButtonState('paused');
    setText('stat-status', 'Paused');
  }
}

function resetExecution() {
  stopPlay();
  stepGen = null;
  setState({
    steps: [], currentStepIndex: -1, status: 'idle',
    currentVars: {}, activePseudocodeLine: -1,
  });
  renderer?.reset();
  refreshCanvas();
  resetPseudocode();
  setButtonState('idle');
  setText('stat-status', 'Idle');
  setText('stat-iteration', '—');
  setText('stat-x', '—');
  setText('stat-val', '—');
  setText('stat-best-x', '—');
  setText('stat-best-val', '—');
  setText('stat-move', '—');
  updateAnnotation('Configure settings and press Run or Step to begin.');
}

// ── UI Helpers ─────────────────────────────────────────────────────────────────

function setButtonState(status) {
  const runBtn  = document.getElementById('run-btn');
  const stepBtn = document.getElementById('step-btn');

  const isRunning   = status === 'running';
  const isConverged = status === 'converged';

  runBtn.innerHTML  = isRunning
    ? '<span class="btn-icon-inner">⏸</span> Pause'
    : '<span class="btn-icon-inner">▶</span> Run';
  runBtn.className  = isRunning ? 'btn btn-warning btn-run' : 'btn btn-primary btn-run';
  runBtn.disabled   = isConverged;

  stepBtn.disabled  = isConverged || isRunning;
}

function updateModeUI(mode) {
  document.querySelectorAll('#mode-toggle .toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  const badge = document.getElementById('mode-badge');
  if (badge) badge.textContent = mode === 'maximize' ? '▲ Maximize' : '▼ Minimize';
}

function updateDomain(domain) {
  setState({ domain });
  document.getElementById('domain-min').value = domain[0];
  document.getElementById('domain-max').value = domain[1];
}

function updateFnDisplay(expr) {
  const el = document.getElementById('fn-expr-display');
  if (el) el.textContent = expr;
}

function refreshCanvas() {
  const s = getState();
  const fn = s.useCustomObjective && s.compiledObjectiveFn
    ? s.compiledObjectiveFn
    : s.objectiveFunction?.fn;
  if (fn) renderer?.setFunction(fn, s.domain);
}

function updateStatsBar(step) {
  const v = step.variables;
  setText('stat-iteration', v.iteration ?? '—');
  setText('stat-x',        v.current_x   !== null ? fmt(v.current_x, 4)   : '—');
  setText('stat-val',      v.current_val !== null ? fmt(v.current_val, 4) : '—');
  setText('stat-best-x',   v.best_x      !== null ? fmt(v.best_x, 4)   : '—');
  setText('stat-best-val', v.best_val    !== null ? fmt(v.best_val, 4) : '—');

  const moveEl = document.getElementById('stat-move');
  if (moveEl) {
    if (step.type === 'accept') { moveEl.textContent = '✓ Accepted'; moveEl.className = 'stat-value move-accepted'; }
    else if (step.type === 'reject') { moveEl.textContent = '✗ Rejected'; moveEl.className = 'stat-value move-rejected'; }
    else { moveEl.textContent = step.type; moveEl.className = 'stat-value'; }
  }
}

function togglePseudocode() {
  const panel = document.getElementById('pseudocode-panel');
  const btn   = document.getElementById('pseudo-toggle');
  const open  = panel.classList.toggle('panel--collapsed');
  btn.textContent = open ? '‹' : '›';
  setState({ pseudocodeVisible: !open });
  setTimeout(() => renderer?.resize(), 350);
}

function toggleControls() {
  const panel = document.getElementById('controls-panel');
  const btn   = document.getElementById('controls-toggle');
  const open  = panel.classList.toggle('panel--collapsed');
  btn.textContent = open ? '›' : '‹';
  setState({ controlsCollapsed: open });
  setTimeout(() => renderer?.resize(), 350);
}
