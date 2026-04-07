// js/algorithms/hillClimbing.js
// Hill Climbing algorithm module.
// Exports: METADATA, PSEUDOCODE, PARAMS, generateSteps()

// ── Metadata ───────────────────────────────────────────────────────────────────
export const METADATA = {
  id: 'hillClimbing',
  name: 'Hill Climbing',
  description:
    'A greedy local search that always accepts a neighbor if it is better than the current state. Simple, fast, but can get trapped in local optima.',
  complexity: 'O(n)',
  tags: ['local-search', 'greedy', 'lecture-2'],
};

// ── UI Parameter definitions (auto-generate sliders in controls panel) ─────────
export const PARAMS = [
  {
    id: 'maxIterations',
    label: 'Max Iterations',
    type: 'range',
    min: 1, max: 500, step: 1,
    default: 100,
  },
];

// ── Pseudocode lines ────────────────────────────────────────────────────────────
// Each entry is one displayed line. The 0-based index of each line MUST match
// the `pseudocodeLine` value emitted by generateSteps() for that event.
// Use {variable_name} placeholders for live value injection.
export const PSEUDOCODE = [
  /* 00 */ '── INITIALIZATION ────────────────────',
  /* 01 */ 'current_x   ← randomInit(domain)',
  /* 02 */ 'current_val ← f(current_x)',
  /* 03 */ 'best_x      ← current_x',
  /* 04 */ 'best_val    ← current_val',
  /* 05 */ '',
  /* 06 */ '── SEARCH LOOP ───────────────────────',
  /* 07 */ 'REPEAT until no improvement:',
  /* 08 */ '  neighbor_x   ← N(current_x)',
  /* 09 */ '  neighbor_val ← f(neighbor_x)',
  /* 10 */ '',
  /* 11 */ '  IF neighbor_val {compare_op} current_val THEN',
  /* 12 */ '    current_x   ← neighbor_x',
  /* 13 */ '    current_val ← neighbor_val',
  /* 14 */ '    update best if improved',
  /* 15 */ '  ELSE',
  /* 16 */ '    STOP  ──  local optimum reached',
  /* 17 */ '',
  /* 18 */ '── RESULT ────────────────────────────',
  /* 19 */ 'RETURN best = ({best_x},  {best_val})',
];

// ── Step Generator ─────────────────────────────────────────────────────────────
/**
 * Generator function that yields StepObjects for each algorithmic event.
 *
 * config shape:
 *   objectiveFn   : (x: number) => number
 *   neighborFn    : (x, params, domain, iter) => number
 *   mode          : 'maximize' | 'minimize'
 *   domain        : [xMin, xMax]
 *   params        : { maxIterations }
 *   neighborParams: { step_size, sigma, … }
 */
export function* generateSteps(config) {
  const { objectiveFn, neighborFn, mode, domain, params, neighborParams } = config;
  const maxIter     = params?.maxIterations ?? 100;
  const compareOp   = mode === 'maximize' ? '>' : '<';

  const isBetter = (a, b) => mode === 'maximize' ? a > b : a < b;

  // ── INIT ──────────────────────────────────────────────────────
  const startX   = domain[0] + Math.random() * (domain[1] - domain[0]);
  const startVal = objectiveFn(startX);

  let currentX   = startX;
  let currentVal = startVal;
  let bestX      = startX;
  let bestVal    = startVal;

  // Helper to build the common variables snapshot
  const vars = (extra = {}) => ({
    current_x:   currentX,
    current_val: currentVal,
    neighbor_x:  null,
    neighbor_val: null,
    best_x:      bestX,
    best_val:    bestVal,
    iteration:   0,
    accepted:    null,
    compare_op:  compareOp,
    ...extra,
  });

  yield {
    index: 0,
    type: 'init',
    pseudocodeLine: 1,
    variables: vars({ iteration: 0 }),
    annotation: `Initialized at  x = ${startX.toFixed(4)},  f(x) = ${startVal.toFixed(4)}`,
    trailPoint: null,
  };

  // ── SEARCH LOOP ───────────────────────────────────────────────
  for (let iter = 1; iter <= maxIter; iter++) {

    // 1. Generate neighbor
    const neighborX = neighborFn(currentX, neighborParams, domain, iter);

    yield {
      index: iter * 4 - 3,
      type: 'generate',
      pseudocodeLine: 8,
      variables: vars({ neighbor_x: neighborX, iteration: iter }),
      annotation: `Iter ${iter}: neighbor_x = ${neighborX.toFixed(4)}`,
      trailPoint: null,
    };

    // 2. Evaluate neighbor
    const neighborVal = objectiveFn(neighborX);

    yield {
      index: iter * 4 - 2,
      type: 'evaluate',
      pseudocodeLine: 9,
      variables: vars({ neighbor_x: neighborX, neighbor_val: neighborVal, iteration: iter }),
      annotation: `Iter ${iter}: f(neighbor) = ${neighborVal.toFixed(4)}`,
      trailPoint: null,
    };

    // 3. Compare & decide
    if (isBetter(neighborVal, currentVal)) {
      currentX   = neighborX;
      currentVal = neighborVal;

      if (isBetter(currentVal, bestVal)) {
        bestX   = currentX;
        bestVal = currentVal;
      }

      yield {
        index: iter * 4 - 1,
        type: 'accept',
        pseudocodeLine: 12,
        variables: vars({ neighbor_x: neighborX, neighbor_val: neighborVal, iteration: iter, accepted: true }),
        annotation: `✓ Accepted!  x = ${currentX.toFixed(4)},  f(x) = ${currentVal.toFixed(4)}`,
        trailPoint: { x: currentX, val: currentVal, accepted: true },
      };

    } else {
      // Rejected — local optimum
      yield {
        index: iter * 4 - 1,
        type: 'reject',
        pseudocodeLine: 15,
        variables: vars({ neighbor_x: neighborX, neighbor_val: neighborVal, iteration: iter, accepted: false }),
        annotation: `✗ Rejected.  Neighbor not better. Stopping.`,
        trailPoint: { x: currentX, val: currentVal, accepted: false },
      };

      // Final convergence step
      yield {
        index: iter * 4,
        type: 'converge',
        pseudocodeLine: 19,
        variables: vars({ neighbor_x: null, neighbor_val: null, iteration: iter, accepted: false }),
        annotation: `Converged!  best_x = ${bestX.toFixed(4)},  f(best_x) = ${bestVal.toFixed(4)}`,
        trailPoint: null,
      };

      return; // Generator done
    }
  }

  // Max iterations exhausted
  yield {
    index: maxIter * 4 + 1,
    type: 'converge',
    pseudocodeLine: 19,
    variables: vars({ iteration: maxIter }),
    annotation: `Max iterations (${maxIter}) reached.  best_x = ${bestX.toFixed(4)},  f(best_x) = ${bestVal.toFixed(4)}`,
    trailPoint: null,
  };
}
