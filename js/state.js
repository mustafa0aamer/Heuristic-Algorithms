// js/state.js
// Centralized, observable application state with lightweight pub/sub.
// All modules READ from state via getState() and WRITE via setState().

const _listeners = new Set();

let _state = {
  // ── Algorithm Config ─────────────────────────────────────────
  algorithm: 'hillClimbing',
  mode: 'maximize',               // 'maximize' | 'minimize'

  // ── Function Config ──────────────────────────────────────────
  objectiveFunction: null,        // ObjectiveFunction object from objective.js
  neighborhoodFunction: null,     // NeighborhoodFunction object from neighborhood.js
  customObjectiveExpr: '',        // Raw user-typed expression string
  customNeighborExpr: '',
  useCustomObjective: false,
  useCustomNeighbor: false,
  compiledObjectiveFn: null,      // Compiled JS function from custom expr
  compiledNeighborFn: null,

  // ── Parameters ───────────────────────────────────────────────
  domain: [-5, 5],
  maxIterations: 100,
  neighborParams: {},             // e.g., { step_size: 0.5 }
  playbackSpeed: 600,             // ms per step in auto-play

  // ── Execution State ──────────────────────────────────────────
  status: 'idle',                 // 'idle' | 'initialized' | 'running' | 'paused' | 'converged'
  steps: [],                      // Array<StepObject> — all generated steps
  currentStepIndex: -1,           // Pointer into steps[]
  playbackTimer: null,            // setInterval handle for auto-play

  // ── Live (derived from current step) ─────────────────────────
  currentVars: {},
  activePseudocodeLine: -1,

  // ── UI State ─────────────────────────────────────────────────
  theme: 'light',
  pseudocodeVisible: true,
  controlsCollapsed: false,
};

/** Get a shallow copy of the state */
export function getState() {
  return { ..._state };
}

/** Get direct reference to state (use carefully — mutations won't notify) */
export function getRawState() {
  return _state;
}

/**
 * Merge patch into state and notify all subscribers.
 * @param {Partial<typeof _state>} patch
 */
export function setState(patch) {
  _state = { ..._state, ...patch };
  _listeners.forEach(fn => {
    try { fn(_state); } catch (e) { console.error('[state] listener error:', e); }
  });
}

/**
 * Subscribe to state changes.
 * @param {function} fn - Called with the new state on every change.
 * @returns {function} Unsubscribe function.
 */
export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
