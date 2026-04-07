// js/functions/neighborhood.js
// Library of built-in neighborhood (step) functions.
// Each defines how a neighbor is generated from the current solution x.

import { clamp } from '../utils/ui.js';

export const NEIGHBORHOOD_FUNCTIONS = [
  {
    id: 'fixed_step',
    name: 'Fixed Step',
    description: 'Move exactly ±step_size in a random direction.',
    params: [
      {
        id: 'step_size', label: 'Step Size',
        type: 'range', min: 0.01, max: 5, step: 0.01, default: 0.5,
      },
    ],
    fn: (x, params, domain, _iter) => {
      const dir = Math.random() > 0.5 ? 1 : -1;
      return clamp(x + dir * params.step_size, domain[0], domain[1]);
    },
  },
  {
    id: 'gaussian',
    name: 'Gaussian Noise',
    description: 'Perturb by Gaussian noise N(0, σ) — allows both small and large jumps.',
    params: [
      {
        id: 'sigma', label: 'Sigma (σ)',
        type: 'range', min: 0.01, max: 3, step: 0.01, default: 0.5,
      },
    ],
    fn: (x, params, domain, _iter) => {
      // Box-Muller transform → standard normal sample
      const u1 = Math.random() || 1e-10;
      const u2 = Math.random();
      const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return clamp(x + gauss * params.sigma, domain[0], domain[1]);
    },
  },
  {
    id: 'large_step',
    name: 'Large Step',
    description: 'Random step between min_step and max_step to help escape local optima.',
    params: [
      {
        id: 'min_step', label: 'Min Step',
        type: 'range', min: 0.1, max: 3, step: 0.1, default: 0.5,
      },
      {
        id: 'max_step', label: 'Max Step',
        type: 'range', min: 0.5, max: 10, step: 0.1, default: 2.0,
      },
    ],
    fn: (x, params, domain, _iter) => {
      const stMin = Math.min(params.min_step, params.max_step);
      const stMax = Math.max(params.min_step, params.max_step);
      const step = stMin + Math.random() * (stMax - stMin);
      const dir = Math.random() > 0.5 ? 1 : -1;
      return clamp(x + dir * step, domain[0], domain[1]);
    },
  },
  {
    id: 'adaptive_step',
    name: 'Adaptive Step',
    description: 'Step size decays exponentially over iterations for fine convergence.',
    params: [
      {
        id: 'initial_step', label: 'Initial Step',
        type: 'range', min: 0.1, max: 5, step: 0.1, default: 2.0,
      },
      {
        id: 'decay', label: 'Decay Rate',
        type: 'range', min: 0.005, max: 0.2, step: 0.005, default: 0.05,
      },
    ],
    fn: (x, params, domain, iter = 0) => {
      const step = Math.max(params.initial_step * Math.exp(-params.decay * iter), 0.001);
      const dir = Math.random() > 0.5 ? 1 : -1;
      return clamp(x + dir * step, domain[0], domain[1]);
    },
  },
  {
    id: 'uniform_random',
    name: 'Uniform Random',
    description: 'Sample a completely new random point from the domain (random restart-like).',
    params: [],
    fn: (_x, _params, domain, _iter) => {
      return domain[0] + Math.random() * (domain[1] - domain[0]);
    },
  },
];

/** Get a neighborhood function by ID */
export function getNeighborhoodById(id) {
  return NEIGHBORHOOD_FUNCTIONS.find(f => f.id === id) ?? null;
}

/** Pick a random neighborhood function (excluding uniform_random for better UX) */
export function getRandomNeighborhood() {
  const candidates = NEIGHBORHOOD_FUNCTIONS.filter(f => f.id !== 'uniform_random');
  return candidates[Math.floor(Math.random() * candidates.length)];
}
