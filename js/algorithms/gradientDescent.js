// js/algorithms/gradientDescent.js
// Gradient Descent / Ascent Algorithm:
// Iteratively moves proportion to the calculated derivative (slope) of the function.
// Uses numerical differentiation for evaluating the gradient of any bound objective function.

export const METADATA = {
  id: 'gradientDescent',
  name: 'Gradient Descent',
  description: 'First-order iterative optimization algorithm to find local extrema. Uses the gradient (slope) to determine the direction and size of the step.',
  complexity: 'O(1) per step',
  tags: ['gradient', 'first-order', 'lecture-3'],
};

// ── UI parameter definitions ────────────────────────────────────────────────────
export const PARAMS = [
  {
    id: 'maxIterations',
    label: 'Max Iterations',
    type: 'range',
    min: 1, max: 1000, step: 10,
    default: 200,
  },
  {
    id: 'learningRate',
    label: 'Learning Rate (δ)',
    type: 'range',
    min: 0.01, max: 2.0, step: 0.01,
    default: 0.1,
  },
];

// ── Pseudocode lines ────────────────────────────────────────────────────────────
export const PSEUDOCODE = [
  /* 00 */ '── INITIALIZATION ────────────────────',
  /* 01 */ 'current_x   ← randomInit(domain)',
  /* 02 */ 'current_val ← f(current_x)',
  /* 03 */ 'best_x, best_val ← current_x, current_val',
  /* 04 */ '',
  /* 05 */ '── SEARCH LOOP ───────────────────────',
  /* 06 */ 'REPEAT until converged or max iterations:',
  /* 07 */ '  slope ← f\'(current_x)',
  /* 08 */ '  step_size ← {learningRate} × slope',
  /* 09 */ '',
  /* 10 */ '  IF minimizing THEN',
  /* 11 */ '    neighbor_x ← current_x - step_size',
  /* 12 */ '  ELSE',
  /* 13 */ '    neighbor_x ← current_x + step_size',
  /* 14 */ '',
  /* 15 */ '  IF |slope| ≈ 0 THEN',
  /* 16 */ '    STOP  ── Optimum reached',
  /* 17 */ '  IF neighbor_x out of bounds THEN',
  /* 18 */ '    STOP  ── Divergence',
  /* 19 */ '',
  /* 20 */ '  neighbor_val ← f(neighbor_x)',
  /* 21 */ '  current_x, current_val ← neighbor_x, neighbor_val',
  /* 22 */ '  update best_x, best_val',
  /* 23 */ '',
  /* 24 */ '── RESULT ────────────────────────────',
  /* 25 */ 'RETURN best_x = {best_x},  f(x) = {best_val}',
];

// ── Step Generator ──────────────────────────────────────────────────────────────
export function* generateSteps(config) {
  const { objectiveFn, mode, domain, params } = config;
  const maxIter      = params?.maxIterations ?? 200;
  const learningRate = params?.learningRate ?? 0.1;

  const isBetter = (a, b) => mode === 'maximize' ? a > b : a < b;

  // Numerical gradient helper (Central Difference)
  const df = (x) => {
    const h = 1e-4;
    return (objectiveFn(x + h) - objectiveFn(x - h)) / (2 * h);
  };

  const snap = (extra) => ({
    current_x: currentX, current_val: currentVal,
    best_x: bestX, best_val: bestVal,
    iteration: 0,
    learningRate: learningRate,
    ...extra
  });

  // ── INITIALIZATION ───────────────────────────────────────────────────────────
  const startX   = domain[0] + Math.random() * (domain[1] - domain[0]);
  const startVal = objectiveFn(startX);

  let currentX   = startX;
  let currentVal = startVal;
  let bestX      = startX;
  let bestVal    = startVal;

  yield {
    index: 0,
    type: 'init',
    pseudocodeLine: 1,
    variables: snap({ iteration: 0 }),
    annotation: `Initialized at x = ${startX.toFixed(4)}, f(x) = ${startVal.toFixed(4)}`,
    trailPoint: { x: startX, val: startVal, accepted: null, isStart: true },
  };

  // ── SEARCH LOOP ──────────────────────────────────────────────────────────────
  for (let iter = 1; iter <= maxIter; iter++) {
    
    // 1. Calculate Slope
    const slope = df(currentX);
    const step_size = learningRate * slope;

    yield {
      index: iter * 5 - 4,
      type: 'calculate_slope',
      pseudocodeLine: 7,
      variables: snap({ slope, step_size, iteration: iter }),
      annotation: `Iter ${iter}: Calculated slope f'(x) = ${slope.toFixed(4)}`,
      trailPoint: null,
    };

    // 2. Convergence Check
    const convergeThreshold = 0.001;
    if (Math.abs(slope) < convergeThreshold) {
      yield {
        index: iter * 5 - 3,
        type: 'converge',
        pseudocodeLine: 16,
        variables: snap({ slope, step_size, iteration: iter }),
        annotation: `Slope is almost zero (|${slope.toFixed(4)}| < ${convergeThreshold}). Local optimum reached.`,
        trailPoint: null,
      };
      
      yield {
        index: iter * 5 + 1,
        type: 'converge',
        pseudocodeLine: 25,
        variables: snap({ iteration: iter }),
        annotation: `Converged! best_x = ${bestX.toFixed(4)}, f(best_x) = ${bestVal.toFixed(4)}`,
        trailPoint: null,
      };
      return; // Generator done
    }

    // 3. Compute next step (neighbor)
    const nextX = mode === 'maximize' ? currentX + step_size : currentX - step_size;
    const outOfBounds = nextX < domain[0] || nextX > domain[1];

    yield {
      index: iter * 5 - 2,
      type: 'generate',
      pseudocodeLine: mode === 'maximize' ? 13 : 11,
      variables: snap({ slope, step_size, neighbor_x: nextX, iteration: iter }),
      annotation: `New candidate x = ${nextX.toFixed(4)}`,
      trailPoint: null,
    };

    // 4. Divergence Check
    if (outOfBounds) {
      yield {
        index: iter * 5 - 1,
        type: 'diverge',
        pseudocodeLine: 18,
        variables: snap({ slope, step_size, neighbor_x: nextX, iteration: iter, accepted: false }),
        annotation: `Diverged! Next step x = ${nextX.toFixed(4)} is out of bounds. Reduce learning rate.`,
        trailPoint: { x: currentX, val: currentVal, accepted: false }
      };
      return;
    }

    // 5. Evaluate and Accept
    const nextVal = objectiveFn(nextX);

    yield {
      index: iter * 5 - 1,
      type: 'evaluate',
      pseudocodeLine: 20,
      variables: snap({ slope, step_size, neighbor_x: nextX, neighbor_val: nextVal, iteration: iter }),
      annotation: `Evaluated new state: f(${nextX.toFixed(4)}) = ${nextVal.toFixed(4)}`,
      trailPoint: null,
    };

    currentX = nextX;
    currentVal = nextVal;
    
    if (isBetter(currentVal, bestVal)) {
      bestX = currentX;
      bestVal = currentVal;
    }

    yield {
      index: iter * 5,
      type: 'accept',
      pseudocodeLine: 21,
      variables: snap({ slope, step_size, neighbor_x: nextX, neighbor_val: nextVal, iteration: iter, accepted: true }),
      annotation: `Moved to x = ${currentX.toFixed(4)}, f(x) = ${currentVal.toFixed(4)}`,
      trailPoint: { x: currentX, val: currentVal, accepted: true },
    };
  }

  // Max iterations reached
  yield {
    index: maxIter * 5 + 1,
    type: 'converge',
    pseudocodeLine: 25,
    variables: snap({ iteration: maxIter }),
    annotation: `Max iterations (${maxIter}) reached. best_x = ${bestX.toFixed(4)}, f(best_x) = ${bestVal.toFixed(4)}`,
    trailPoint: null,
  };
}
