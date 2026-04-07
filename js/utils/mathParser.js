// js/utils/mathParser.js
// Safe wrapper around math.js for compiling and evaluating custom user expressions.

/**
 * Compile a math.js expression string into a fast JS callable.
 * Requires math.js to be loaded globally (via CDN script tag).
 * @param {string} expr  e.g., "x^2 - 5*x + 6"
 * @returns {(x: number) => number}
 * @throws {Error} if expression is invalid
 */
export function compileExpression(expr) {
  if (typeof window.math === 'undefined') {
    throw new Error('math.js is not loaded. Check your internet connection or CDN.');
  }
  const trimmed = expr.trim();
  if (!trimmed) throw new Error('Expression cannot be empty.');

  // math.js compile → evaluate with scope { x }
  const compiled = window.math.compile(trimmed);

  return (x) => {
    try {
      const result = compiled.evaluate({ x, pi: Math.PI, e: Math.E });
      if (typeof result !== 'number' || !isFinite(result)) return 0;
      return result;
    } catch {
      return 0;
    }
  };
}

/**
 * Try to compile an expression, returning a validation result.
 * @param {string} expr
 * @returns {{ valid: boolean, fn?: Function, error?: string }}
 */
export function validateExpression(expr) {
  try {
    const fn = compileExpression(expr);
    // Test at a few points to catch runtime errors
    fn(0); fn(1); fn(-1); fn(0.5);
    return { valid: true, fn };
  } catch (e) {
    return { valid: false, error: e.message.replace(/\n/g, ' ') };
  }
}

/**
 * Sample a function over a domain to find its approximate value range.
 * @param {Function} fn
 * @param {[number, number]} domain
 * @param {number} samples
 * @returns {{ min: number, max: number }}
 */
export function sampleValueRange(fn, domain, samples = 200) {
  const [xMin, xMax] = domain;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + (i / samples) * (xMax - xMin);
    const y = fn(x);
    if (isFinite(y)) {
      if (y < min) min = y;
      if (y > max) max = y;
    }
  }
  // Add 10% padding
  const pad = (max - min) * 0.1 || 1;
  return { min: min - pad, max: max + pad };
}
