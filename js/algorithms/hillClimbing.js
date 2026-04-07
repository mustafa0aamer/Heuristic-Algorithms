// js/algorithms/hillClimbing.js
// Steepest-Ascent Hill Climbing:
// Each iteration evaluates N neighbors and moves to the BEST one.
// Stops only when ALL neighbors are worse than the current position.
// (Reference: Hill and gradiant.html — evaluates left + right, picks best.)

export const METADATA = {
  id: 'hillClimbing',
  name: 'Hill Climbing',
  description:
    'Steepest-ascent local search: generates N neighbors each iteration, always moving to the best. Stops when no neighbor improves the current state.',
  complexity: 'O(n × k)',
  tags: ['local-search', 'greedy', 'lecture-2'],
};

// ── UI parameter definitions ────────────────────────────────────────────────────
export const PARAMS = [
  {
    id: 'maxIterations',
    label: 'Max Iterations',
    type: 'range',
    min: 1, max: 500, step: 1,
    default: 100,
  },
  {
    id: 'numCandidates',
    label: 'Neighbors per Step',
    type: 'range',
    min: 1, max: 20, step: 1,
    default: 5,
  },
];

// ── Pseudocode lines ────────────────────────────────────────────────────────────
// {variable} placeholders receive live values at each step.
export const PSEUDOCODE = [
  /* 00 */ '── INITIALIZATION ────────────────────',
  /* 01 */ 'current_x   ← randomInit(domain)',
  /* 02 */ 'current_val ← f(current_x)',
  /* 03 */ 'best_x, best_val ← current_x, current_val',
  /* 04 */ '',
  /* 05 */ '── SEARCH LOOP ───────────────────────',
  /* 06 */ 'REPEAT until no improvement:',
  /* 07 */ '  candidates ← N(current_x, n={numCandidates})',
  /* 08 */ '  nbr_x   ← argbest f over candidates',
  /* 09 */ '  nbr_val ← f(nbr_x)',
  /* 10 */ '',
  /* 11 */ '  IF nbr_val {compare_op} current_val THEN',
  /* 12 */ '    current_x   ← nbr_x',
  /* 13 */ '    current_val ← nbr_val',
  /* 14 */ '    update best_x, best_val if improved',
  /* 15 */ '  ELSE',
  /* 16 */ '    STOP  ── local optimum reached',
  /* 17 */ '',
  /* 18 */ '── RESULT ────────────────────────────',
  /* 19 */ 'RETURN best_x = {best_x},  f(x) = {best_val}',
];

// ── Step Generator ──────────────────────────────────────────────────────────────
/**
 * Steepest-ascent Hill Climbing generator.
 *
 * Each iteration:
 *  1. Call neighborFn  numCandidates  times to get candidate neighbors.
 *  2. Pick the best candidate (highest for maximize, lowest for minimize).
 *  3. If best candidate beats current → accept and move.
 *  4. If not → local optimum → stop.
 *
 * config:
 *   objectiveFn     : (x) => number
 *   neighborFn      : (x, params, domain, iter) => number
 *   mode            : 'maximize' | 'minimize'
 *   domain          : [xMin, xMax]
 *   params          : { maxIterations, numCandidates }
 *   neighborParams  : { step_size, sigma, … }
 */
export function* generateSteps(config) {
  const { objectiveFn, neighborFn, mode, domain, params, neighborParams } = config;
  const maxIter       = params?.maxIterations  ?? 100;
  const numCandidates = params?.numCandidates  ?? 5;
  const compareOp     = mode === 'maximize' ? '>' : '<';

  const isBetter = (a, b) => mode === 'maximize' ? a > b : a < b;

  // Helper to build a variables snapshot
  const snap = (extra = {}) => ({
    current_x: currentX, current_val: currentVal,
    neighbor_x: null, neighbor_val: null,
    best_x: bestX, best_val: bestVal,
    iteration: 0, accepted: null,
    compare_op: compareOp,
    numCandidates,
    ...extra,
  });

  // ── INITIALIZATION ───────────────────────────────────────────────────────────
  const startX   = domain[0] + Math.random() * (domain[1] - domain[0]);
  const startVal = objectiveFn(startX);

  let currentX   = startX;
  let currentVal = startVal;
  let bestX      = startX;
  let bestVal    = startVal;

  // Emit init step — trailPoint marks the starting position on the graph
  yield {
    index: 0,
    type: 'init',
    pseudocodeLine: 1,
    variables: snap({ iteration: 0 }),
    annotation: `Initialized at  x = ${startX.toFixed(4)},  f(x) = ${startVal.toFixed(4)}`,
    trailPoint: { x: startX, val: startVal, accepted: null, isStart: true },
  };

  // ── SEARCH LOOP ──────────────────────────────────────────────────────────────
  for (let iter = 1; iter <= maxIter; iter++) {

    // 1. Generate numCandidates neighbors
    const candidates = [];
    for (let k = 0; k < numCandidates; k++) {
      const cx = neighborFn(currentX, neighborParams, domain, iter);
      const cv = objectiveFn(cx);
      candidates.push({ x: cx, val: cv });
    }

    // 2. Sort: best candidate first
    candidates.sort((a, b) =>
      mode === 'maximize' ? b.val - a.val : a.val - b.val
    );
    const best = candidates[0];

    // Step: show neighborhood generation
    yield {
      index: iter * 3 - 2,
      type: 'generate',
      pseudocodeLine: 7,
      variables: snap({ neighbor_x: best.x, iteration: iter }),
      annotation: `Iter ${iter}: Generated ${numCandidates} candidates → best neighbor at x = ${best.x.toFixed(4)}`,
      trailPoint: null,
    };

    // Step: show best candidate evaluation
    yield {
      index: iter * 3 - 1,
      type: 'evaluate',
      pseudocodeLine: 9,
      variables: snap({ neighbor_x: best.x, neighbor_val: best.val, iteration: iter }),
      annotation: `Iter ${iter}: f(best_neighbor) = ${best.val.toFixed(4)},  f(current) = ${currentVal.toFixed(4)}`,
      trailPoint: null,
    };

    // 3. Compare and decide
    if (isBetter(best.val, currentVal)) {
      // Accept
      currentX   = best.x;
      currentVal = best.val;

      if (isBetter(currentVal, bestVal)) {
        bestX   = currentX;
        bestVal = currentVal;
      }

      yield {
        index: iter * 3,
        type: 'accept',
        pseudocodeLine: 12,
        variables: snap({ neighbor_x: best.x, neighbor_val: best.val, iteration: iter, accepted: true }),
        annotation: `✓ Moved to  x = ${currentX.toFixed(4)},  f(x) = ${currentVal.toFixed(4)}`,
        trailPoint: { x: currentX, val: currentVal, accepted: true },
      };

    } else {
      // Reject — local optimum
      yield {
        index: iter * 3,
        type: 'reject',
        pseudocodeLine: 15,
        variables: snap({ neighbor_x: best.x, neighbor_val: best.val, iteration: iter, accepted: false }),
        annotation: `✗ All ${numCandidates} neighbors are worse. Local optimum found.`,
        trailPoint: { x: currentX, val: currentVal, accepted: false },
      };

      yield {
        index: iter * 3 + 1,
        type: 'converge',
        pseudocodeLine: 19,
        variables: snap({ iteration: iter }),
        annotation: `Converged!  best_x = ${bestX.toFixed(4)},  f(best_x) = ${bestVal.toFixed(4)}`,
        trailPoint: null,
      };

      return; // Generator done
    }
  }

  // Max iterations exhausted
  yield {
    index: maxIter * 3 + 1,
    type: 'converge',
    pseudocodeLine: 19,
    variables: snap({ iteration: maxIter }),
    annotation: `Max iterations (${maxIter}) reached.  best_x = ${bestX.toFixed(4)},  f(best_x) = ${bestVal.toFixed(4)}`,
    trailPoint: null,
  };
}
