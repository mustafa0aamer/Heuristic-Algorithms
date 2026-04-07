# Heuristic Optimization Visualization Platform — Architecture Guide

> **Version:** 1.0 | **Last Updated:** Phase 2 (Gradient Descent)  
> This document is the single source of truth for project structure, design patterns, and the exact methodology for extending the platform with new algorithms, objective functions, and neighborhood functions.

---

## Table of Contents
1. [Philosophy & Tech Stack](#1-philosophy--tech-stack)
2. [Project Structure](#2-project-structure)
3. [Design System](#3-design-system)
4. [State Management](#4-state-management)
5. [Step Object Schema](#5-step-object-schema)
6. [Algorithm Module Contract](#6-algorithm-module-contract)
7. [Objective Function Template](#7-objective-function-template)
8. [Neighborhood Function Template](#8-neighborhood-function-template)
9. [Pseudocode Live Binding System](#9-pseudocode-live-binding-system)
10. [Visualization Canvas API](#10-visualization-canvas-api)
11. [Adding a New Algorithm — Checklist](#11-adding-a-new-algorithm--checklist)
12. [Adding a New Objective Function — Checklist](#12-adding-a-new-objective-function--checklist)
13. [Adding a New Neighborhood Function — Checklist](#13-adding-a-new-neighborhood-function--checklist)

---

## 1. Philosophy & Tech Stack

### Core Principles
- **Static-first:** No backend, no build step. The entire app is plain HTML + CSS + JS ES Modules, served from GitHub Pages.
- **Module-first:** Each algorithm, function, or utility lives in its own JS file and is imported where needed. Adding a new algorithm never touches existing files beyond a single registry.
- **Step-based execution:** All algorithms produce discrete, serializable **step objects**. The UI only knows how to *render a step*. This decouples visualization from algorithm logic completely.
- **Live-binding pseudocode:** Pseudocode lines are templates with `{variable}` placeholders. At each step, real variable values replace the placeholders automatically.

### Tech Stack
| Concern | Technology | Rationale |
|---|---|---|
| Structure | HTML5 (Semantic) | GitHub Pages, zero setup |
| Styling | Vanilla CSS + Custom Properties | Theming, no preprocessor needed |
| Logic | Vanilla JavaScript (ES Modules) | No build step, clean imports |
| Math Parsing | [math.js](https://mathjs.org/) (CDN) | Parse user-defined expressions safely |
| Fonts | Google Fonts (Inter + Fira Code) | Clean UI + monospace for code/math |
| Hosting | GitHub Pages | Static, free, reliable |

---

## 2. Project Structure

```
heuristic-algorithms/
│
├── index.html                  ← Main entry point; loads all modules
├── ARCHITECTURE.md             ← This file (blueprint)
├── README.md                   ← Public-facing project description
│
├── css/
│   └── main.css                ← All styles: design tokens, layout, components
│
└── js/
    ├── main.js                 ← App bootstrap: binds DOM events, starts render loop
    ├── state.js                ← Centralized, observable application state
    │
    ├── algorithms/
    │   ├── index.js            ← Algorithm REGISTRY (only file changed when adding new algo)
    │   └── hillClimbing.js     ← Hill Climbing implementation module
    │   └── [futureAlgo].js     ← e.g., simulatedAnnealing.js, geneticAlgorithm.js
    │
    ├── functions/
    │   ├── objective.js        ← Library of built-in objective functions
    │   └── neighborhood.js     ← Library of built-in neighborhood functions
    │
    ├── visualization/
    │   ├── canvas.js           ← Canvas renderer: plots function curve + solution state
    │   └── pseudocode.js       ← Pseudocode panel: highlights lines, injects live values
    │
    └── utils/
        ├── mathParser.js       ← Wraps math.js: compiles & evaluates custom expressions
        ├── theme.js            ← Dark/light mode toggle logic
        └── ui.js               ← Shared UI helpers (toasts, debounce, formatters)
```

---

## 3. Design System

All visual tokens are CSS Custom Properties defined in `:root` and overridden in `[data-theme="dark"]`. **Never hardcode colors in component styles.**

```css
/* Example token structure in css/main.css */
:root {
  --color-bg:         #f8f9ff;
  --color-surface:    #ffffff;
  --color-primary:    #6366f1;     /* Indigo — main brand color */
  --color-accent:     #f59e0b;     /* Amber — highlights, pseudocode */
  --color-text:       #1e293b;
  --color-text-muted: #64748b;
  --color-border:     #e2e8f0;

  /* Canvas */
  --canvas-curve:     #818cf8;     /* Function curve color */
  --canvas-current:   #f59e0b;     /* Current solution dot */
  --canvas-accepted:  #22c55e;     /* Accepted move trail */
  --canvas-rejected:  #f43f5e;     /* Rejected move indicator */
  --canvas-neighbor:  #a78bfa;     /* Neighbor candidate */
}
```

### Responsive Breakpoints
| Breakpoint | Design |
|---|---|
| `>= 1024px` | 3-column layout (controls | canvas | pseudocode) |
| `768px – 1023px` | 2-column (controls | canvas+pseudocode stacked) |
| `< 768px` | 1-column, accordion controls, pseudocode collapsible below canvas |

---

## 4. State Management

The global state lives in `js/state.js` as a plain object with a lightweight event system. **All modules read from state and dispatch events to modify it.**

```js
// js/state.js — Full schema

export const state = {
  // ── Algorithm ────────────────────────────
  algorithm: 'hillClimbing',       // Key into ALGORITHM_REGISTRY
  mode: 'maximize',                // 'maximize' | 'minimize'

  // ── Functions ────────────────────────────
  objectiveFunction: null,         // ObjectiveFunction object (see §7)
  neighborhoodFunction: null,      // NeighborhoodFunction object (see §8)
  customObjectiveExpr: '',         // User's raw custom expression string
  customNeighborExpr: '',          // User's raw custom neighbor expression
  useCustomObjective: false,
  useCustomNeighbor: false,

  // ── Parameters ───────────────────────────
  domain: [-5, 5],                 // [xMin, xMax]
  maxIterations: 100,
  neighborParams: {},              // e.g., { step_size: 0.5, sigma: 1.0 }

  // ── Execution ────────────────────────────
  status: 'idle',                  // 'idle' | 'initialized' | 'running' | 'paused' | 'converged'
  steps: [],                       // Array<StepObject> — all generated steps
  currentStepIndex: -1,            // Pointer into steps[]
  playbackSpeed: 500,              // ms between auto-play steps

  // ── Live (derived from currentStep) ──────
  currentVars: {},                 // Snapshot of variables at current step
  activePseudocodeLine: -1,        // 0-indexed line to highlight

  // ── Display ──────────────────────────────
  theme: 'light',                  // 'light' | 'dark'
  pseudocodeVisible: true,
  controlsCollapsed: false,
};
```

### State Mutation Pattern

```js
// js/state.js exports:
export function setState(patch) { /* merges patch into state, calls listeners */ }
export function subscribe(listener) { /* registers a callback fired on any state change */ }
export function getState() { return state; }

// Usage in any module:
import { setState, subscribe } from '../state.js';

setState({ mode: 'minimize' });                   // Simple mutation
subscribe((newState) => renderPseudocode(newState)); // Reactive listener
```

---

## 5. Step Object Schema

Every algorithm's generator function yields **Step objects**. This is the protocol between algorithm logic and the visualization layer.

```ts
interface StepObject {
  index:           number;   // Sequential step number (0, 1, 2, ...)
  type:            StepType; // See enum below
  pseudocodeLine:  number;   // 0-indexed line index into algorithm's PSEUDOCODE array
  variables: {               // Snapshot of all live variables for pseudocode injection
    current_x:    number;
    current_val:  number;
    neighbor_x:   number | null;
    neighbor_val: number | null;
    iteration:    number;
    accepted:     boolean | null;
    [key: string]: any;      // Algorithm-specific extras (e.g., temperature for SA)
  };
  annotation: string;        // Human-readable description: "Moved to x=3.42, f(x)=14.8"
  trailPoint?: {             // Point to add to the history trail on the canvas
    x: number;
    val: number;
    accepted: boolean;
  };
}

type StepType =
  | 'init'        // Algorithm initialized, random start
  | 'generate'    // Neighbor generated (not yet evaluated)
  | 'evaluate'    // Neighbor evaluated, comparison shown
  | 'accept'      // Neighbor accepted, state updated
  | 'reject'      // Neighbor rejected, state unchanged
  | 'converge'    // Algorithm terminated (local optimum or max iter)
  | 'restart';    // (Optional) Algorithm restarted from new random point
```

---

## 6. Algorithm Module Contract

Every algorithm module in `js/algorithms/` must export the following named exports:

```js
// ── REQUIRED EXPORTS ─────────────────────────────────────────────────────────

/**
 * Human-readable array of pseudocode lines.
 * Use {variable_name} placeholders for live value injection.
 * Line index (0-based) maps directly to step.pseudocodeLine.
 */
export const PSEUDOCODE = [
  "current_state ← random_init(domain)",             // line 0
  "current_val   ← f(current_state)",                 // line 1
  "best_state    ← current_state",                    // line 2
  "REPEAT",                                           // line 3
  "  neighbor    ← generate_neighbor(current_state)", // line 4
  "  neighbor_val ← f(neighbor)",                     // line 5
  "  IF neighbor_val {op} current_val THEN",          // line 6
  "    current_state ← neighbor",                     // line 7
  "  ELSE",                                           // line 8
  "    RETURN best_state  ← local optimum",           // line 9
  "END REPEAT",                                       // line 10
];

/**
 * Algorithm parameter definitions — used to auto-generate the UI controls.
 */
export const PARAMS = [
  {
    id: 'maxIterations',
    label: 'Max Iterations',
    type: 'range',          // 'range' | 'number' | 'select'
    min: 1, max: 1000, step: 1,
    default: 100,
  },
  // add more as needed
];

/**
 * The core generator. Receives a config object assembled from state.
 * Yields StepObject after each meaningful algorithmic event.
 * Must be a JavaScript generator function (function*).
 */
export function* generateSteps(config) {
  // config: { objectiveFn, neighborFn, mode, domain, params, ... }
  // yield StepObjects...
}

/**
 * Metadata shown in the algorithm selector dropdown.
 */
export const METADATA = {
  id: 'hillClimbing',
  name: 'Hill Climbing',
  description: 'Greedy local search that always moves to a better neighbor.',
  complexity: 'O(n × k)',  // n iterations, k neighbors evaluated
  tags: ['local-search', 'greedy', 'lecture-2'],
};
```

### Algorithm Registry

`js/algorithms/index.js` is the **only file** you modify when adding a new algorithm:

```js
// js/algorithms/index.js
import * as hillClimbing from './hillClimbing.js';
// import * as simulatedAnnealing from './simulatedAnnealing.js';  ← just uncomment

export const ALGORITHM_REGISTRY = {
  [hillClimbing.METADATA.id]: hillClimbing,
  // [simulatedAnnealing.METADATA.id]: simulatedAnnealing,
};
```

---

## 7. Objective Function Template

Each entry in `js/functions/objective.js` must conform to:

```js
{
  id:          'sphere',                   // Unique string key
  name:        'Sphere (x²)',              // Display name in dropdown
  expression:  'x^2',                     // math.js-compatible string (for display)
  fn:          (x) => x * x,              // Fast native JS evaluation
  domain:      [-5, 5],                   // Recommended [xMin, xMax]
  valueRange:  [0, 25],                   // Approx Y range for canvas scaling
  description: 'Simple quadratic bowl. Global minimum at x=0.',
  category:    'unimodal',                // 'unimodal' | 'multimodal' | 'noisy' | 'custom'
  optimum: {
    x: 0, val: 0, type: 'minimum'        // Known global optimum for reference line
  }
}
```

### Built-in Library (Phase 1)
| ID | Name | Expression | Category |
|---|---|---|---|
| `sphere` | Sphere | `x²` | unimodal |
| `rastrigin1d` | Rastrigin 1D | `x² - 10cos(2πx) + 10` | multimodal |
| `sine_composite` | Sine Composite | `sin(x) + sin(3x)` | multimodal |
| `quartic` | Quartic | `x⁴ - 4x² + 0.5x` | multimodal |
| `parabola_shifted` | Shifted Parabola | `-(x-2)² + 4` | unimodal |
| `abs_valley` | Absolute Valley | `\|x - 1\| + \|x + 1\|` | convex |
| `exponential` | Exponential | `e^(-x²) * sin(5x)` | multimodal |
| `cubic` | Cubic | `x³ - 3x² - 9x + 5` | multimodal |
| `xsinx` | x·sin(x) | `x·sin(x)` | irregular |
| `step_fn` | Step Function | `floor(x) * sin(x)` | discontinuous |

---

## 8. Neighborhood Function Template

Each entry in `js/functions/neighborhood.js` must conform to:

```js
{
  id:          'fixed_step',
  name:        'Fixed Step',
  description: 'Move by a fixed amount in a random direction.',
  params: [
    {
      id: 'step_size', label: 'Step Size',
      type: 'range', min: 0.01, max: 5, step: 0.01, default: 0.5
    }
  ],
  /**
   * @param {number} x          Current solution value
   * @param {Object} params     Parameter values (keyed by param.id)
   * @param {[number,number]} domain  [xMin, xMax]
   * @returns {number}          Neighbor solution value
   */
  fn: (x, params, domain) => {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const neighbor = x + direction * params.step_size;
    return Math.max(domain[0], Math.min(domain[1], neighbor)); // clamp to domain
  }
}
```

### Built-in Library (Phase 1)
| ID | Name | Description |
|---|---|---|
| `fixed_step` | Fixed Step | Move ±step_size (random direction) |
| `gaussian` | Gaussian Noise | Add Gaussian(0, σ) perturbation |
| `large_step` | Large Step | Larger jump to escape local optima |
| `adaptive_step` | Adaptive Step | Step shrinks proportionally with iteration |
| `uniform_random` | Uniform Random | Random sample from entire domain |

---

## 9. Pseudocode Live Binding System

### How It Works

The pseudocode panel (`js/visualization/pseudocode.js`) does two things on every step:

1. **Line Highlighting:** Reads `state.activePseudocodeLine` and applies a highlight CSS class to that `<li>` element.
2. **Value Injection:** For each pseudocode line, it checks for `{variable_name}` tokens and replaces them with live values from `state.currentVars`.

### Injection Syntax

In the `PSEUDOCODE` array, wrap variable names in `{}`:

```js
export const PSEUDOCODE = [
  "current_state ← random_init(domain)",
  // Step that shows a live value:
  "current_val   ← f({current_x})",              // → "current_val ← f(3.42)"
  "IF f({neighbor_x}) > f({current_x}) THEN",    // → "IF f(3.85) > f(3.42) THEN"
];
```

The renderer in `pseudocode.js` does:
```js
function injectValues(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null
      ? (typeof val === 'number' ? val.toFixed(3) : val)
      : `{${key}}`;  // fallback: keep placeholder if value not yet available
  });
}
```

### Variable Naming Convention

Always use `snake_case` for variable names in step objects. Common names:

| Variable | Meaning |
|---|---|
| `current_x` | Current solution position |
| `current_val` | f(current_x) |
| `neighbor_x` | Neighbor candidate position |
| `neighbor_val` | f(neighbor_x) |
| `iteration` | Current iteration number |
| `accepted` | Whether the last move was accepted |
| `temperature` | (SA only) current temperature |
| `best_x` | Best-so-far solution |
| `best_val` | f(best_x) |

---

## 10. Visualization Canvas API

`js/visualization/canvas.js` exports a single `CanvasRenderer` class:

```js
const renderer = new CanvasRenderer(canvasElement);

// Called once per function change:
renderer.setFunction(objectiveFn, domain);

// Called on every step to update display:
renderer.renderStep(stepObject, allPreviousSteps, mode);

// Called on resize:
renderer.resize();
```

### Rendering Layers (drawn in order)
1. **Background** — solid fill matching theme
2. **Grid** — subtle horizontal/vertical lines
3. **Axes** — X and Y axes with tick marks and labels
4. **Function Curve** — smooth sampled curve with gradient stroke
5. **History Trail** — past accepted positions (faded dots + dashed line)
6. **Rejected Neighbor** — last rejected neighbor (red, hollow)
7. **Neighbor Candidate** — current neighbor being evaluated (purple)
8. **Current State** — current position (glowing amber dot)
9. **Global Optimum** — reference marker (star icon)

### Coordinate Transform

```js
// World → Canvas pixel
function toCanvas(x, val, bounds, canvasW, canvasH, margin) {
  const cx = margin.left + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * (canvasW - margin.left - margin.right);
  const cy = margin.top  + (1 - (val - bounds.yMin) / (bounds.yMax - bounds.yMin)) * (canvasH - margin.top - margin.bottom);
  return { cx, cy };
}
```

---

## 11. Adding a New Algorithm — Checklist

```
[ ] 1. Create js/algorithms/myAlgorithm.js
[ ] 2. Export METADATA   — id, name, description, tags
[ ] 3. Export PSEUDOCODE — string[] with {variable} placeholders
[ ] 4. Export PARAMS     — parameter definition array
[ ] 5. Export generateSteps(config) — generator function yielding StepObjects
[ ] 6. Register in js/algorithms/index.js (ONE LINE: add import + add to registry object)
[ ] 7. (Optional) Add algorithm-specific UI controls by expanding PARAMS
[ ] 8. (Optional) Extend CanvasRenderer if you need custom visualization layers
[ ] 9. Test: verify pseudocode lines count matches max pseudocodeLine value in steps
```

---

## 12. Adding a New Objective Function — Checklist

```
[ ] 1. Open js/functions/objective.js
[ ] 2. Add a new object to the OBJECTIVE_FUNCTIONS array following the template (§7)
[ ] 3. Define: id, name, expression, fn, domain, valueRange, description, category
[ ] 4. (Optional) Add optimum for reference line on canvas
[ ] 5. No other files need changing — the dropdown auto-populates
```

---

## 13. Adding a New Neighborhood Function — Checklist

```
[ ] 1. Open js/functions/neighborhood.js
[ ] 2. Add a new object to the NEIGHBORHOOD_FUNCTIONS array following the template (§8)
[ ] 3. Define: id, name, description, params[], fn
[ ] 4. The params[] array auto-generates UI sliders/inputs in the controls panel
[ ] 5. No other files need changing
```

---

*End of Architecture Guide — keep this document updated with each new phase.*
