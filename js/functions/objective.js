// js/functions/objective.js
// Library of 10 built-in objective functions.
// To add a new one, just push a new object to OBJECTIVE_FUNCTIONS — nothing else changes.

export const OBJECTIVE_FUNCTIONS = [
  {
    id: 'sphere',
    name: 'Sphere  ·  f(x) = x²',
    expression: 'x^2',
    fn: (x) => x * x,
    domain: [-5, 5],
    description: 'Simple unimodal bowl. Global minimum at x = 0.',
    category: 'unimodal',
    optimum: { x: 0, val: 0, type: 'minimum' },
  },
  {
    id: 'rastrigin1d',
    name: 'Rastrigin  ·  f(x) = x² − 10cos(2πx) + 10',
    expression: 'x^2 - 10*cos(2*pi*x) + 10',
    fn: (x) => x * x - 10 * Math.cos(2 * Math.PI * x) + 10,
    domain: [-5.12, 5.12],
    description: 'Highly multimodal with many local minima. Global min at x = 0.',
    category: 'multimodal',
    optimum: { x: 0, val: 0, type: 'minimum' },
  },
  {
    id: 'sine_composite',
    name: 'Sine Composite  ·  f(x) = sin(x) + sin(3x)',
    expression: 'sin(x) + sin(3*x)',
    fn: (x) => Math.sin(x) + Math.sin(3 * x),
    domain: [-Math.PI * 2, Math.PI * 2],
    description: 'Sum of two sinusoids — irregular peaks and valleys.',
    category: 'multimodal',
    optimum: null,
  },
  {
    id: 'quartic',
    name: 'Quartic  ·  f(x) = x⁴ − 4x² + 0.5x',
    expression: 'x^4 - 4*x^2 + 0.5*x',
    fn: (x) => Math.pow(x, 4) - 4 * x * x + 0.5 * x,
    domain: [-2.5, 2.5],
    description: 'Bimodal quartic with two distinct valleys.',
    category: 'multimodal',
    optimum: null,
  },
  {
    id: 'parabola_shifted',
    name: 'Shifted Parabola  ·  f(x) = −(x−2)² + 4',
    expression: '-(x-2)^2 + 4',
    fn: (x) => -(x - 2) * (x - 2) + 4,
    domain: [-3, 7],
    description: 'Inverted parabola with clear global maximum at x = 2.',
    category: 'unimodal',
    optimum: { x: 2, val: 4, type: 'maximum' },
  },
  {
    id: 'cubic',
    name: 'Cubic  ·  f(x) = x³ − 3x² − 9x + 5',
    expression: 'x^3 - 3*x^2 - 9*x + 5',
    fn: (x) => Math.pow(x, 3) - 3 * x * x - 9 * x + 5,
    domain: [-4, 6],
    description: 'Cubic polynomial — local max at x=−1, local min at x=3.',
    category: 'multimodal',
    optimum: { x: -1, val: 10, type: 'local_max' },
  },
  {
    id: 'xsinx',
    name: 'x·sin(x)',
    expression: 'x * sin(x)',
    fn: (x) => x * Math.sin(x),
    domain: [-10, 10],
    description: 'Oscillating with growing amplitude. Many local optima.',
    category: 'multimodal',
    optimum: null,
  },
  {
    id: 'exp_sine',
    name: 'Gaussian Sine  ·  f(x) = e^(−x²)·sin(5x)',
    expression: 'exp(-x^2) * sin(5*x)',
    fn: (x) => Math.exp(-x * x) * Math.sin(5 * x),
    domain: [-3, 3],
    description: 'Gaussian-windowed sine. Multiple hills confined near origin.',
    category: 'multimodal',
    optimum: null,
  },
  {
    id: 'bumpy_cosine',
    name: 'Bumpy Hill  ·  f(x) = cos(x) + cos(2x) + cos(3x)',
    expression: 'cos(x) + cos(2*x) + cos(3*x)',
    fn: (x) => Math.cos(x) + Math.cos(2 * x) + Math.cos(3 * x),
    domain: [-6, 6],
    description: 'Sum of three cosine harmonics — irregular bumpy landscape.',
    category: 'multimodal',
    optimum: null,
  },
  {
    id: 'abs_valley',
    name: 'Negative Abs  ·  f(x) = −|x − 1|',
    expression: '-abs(x - 1)',
    fn: (x) => -Math.abs(x - 1),
    domain: [-5, 5],
    description: 'V-shaped (non-differentiable). Global max at x = 1.',
    category: 'convex',
    optimum: { x: 1, val: 0, type: 'maximum' },
  },
];

/** Get a function definition by its ID */
export function getObjectiveById(id) {
  return OBJECTIVE_FUNCTIONS.find(f => f.id === id) ?? null;
}

/** Pick a random function from the library */
export function getRandomObjective() {
  return OBJECTIVE_FUNCTIONS[Math.floor(Math.random() * OBJECTIVE_FUNCTIONS.length)];
}
