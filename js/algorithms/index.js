// js/algorithms/index.js
// ALGORITHM REGISTRY — the only file that changes when a new algorithm is added.
// 1. Import the module.
// 2. Add it to ALGORITHM_REGISTRY using its METADATA.id as the key.

import * as hillClimbing from './hillClimbing.js';
import * as gradientDescent from './gradientDescent.js';
// import * as simulatedAnnealing from './simulatedAnnealing.js';  // ← Phase 2
// import * as geneticAlgorithm   from './geneticAlgorithm.js';    // ← Phase 3
// import * as tabooSearch        from './tabooSearch.js';          // ← Phase 4

export const ALGORITHM_REGISTRY = {
  [hillClimbing.METADATA.id]: hillClimbing,
  [gradientDescent.METADATA.id]: gradientDescent,
  // [simulatedAnnealing.METADATA.id]: simulatedAnnealing,
  // [geneticAlgorithm.METADATA.id]:   geneticAlgorithm,
};

/** Retrieve an algorithm module by ID */
export function getAlgorithm(id) {
  return ALGORITHM_REGISTRY[id] ?? null;
}
