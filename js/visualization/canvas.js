// js/visualization/canvas.js
// CanvasRenderer: draws the function landscape, axes, history trail,
// current state, and neighbor candidate on an HTML5 Canvas element.

import { sampleValueRange } from '../utils/mathParser.js';

const MARGIN = { top: 44, right: 24, bottom: 52, left: 60 };
const SAMPLES = 300; // curve smoothness

export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.dpr      = window.devicePixelRatio || 1;

    this.objectiveFn  = null;
    this.domain       = [-5, 5];
    this.valueRange   = { min: -1, max: 25 };
    this.mode         = 'maximize';

    this.trailPoints  = [];  // { x, val, accepted }[]
    this.currentStep  = null;

    this._resize();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Set the function to plot and compute its value range automatically.
   * @param {Function} fn   (x: number) => number
   * @param {[number, number]} domain
   */
  setFunction(fn, domain) {
    this.objectiveFn = fn;
    this.domain      = domain;
    this.valueRange  = sampleValueRange(fn, domain, SAMPLES);
    this.trailPoints = [];
    this.currentStep = null;
    this.draw();
  }

  /**
   * Render the canvas for a given step.
   * @param {object} step       StepObject from algorithm generator
   * @param {string} mode       'maximize' | 'minimize'
   */
  renderStep(step, mode) {
    this.mode        = mode;
    this.currentStep = step;

    // Accumulate trail on accepted/reject steps
    if (step?.trailPoint) {
      this.trailPoints.push(step.trailPoint);
    }

    this.draw();
  }

  /** Full redraw. Call on resize or theme change. */
  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.objectiveFn) { this._drawEmpty(); return; }

    this._drawGrid();
    this._drawCurve();
    this._drawAxes();
    this._drawOptimumMarker();
    this._drawTrail();
    this._drawNeighbor();
    this._drawCurrent();
  }

  /** Handle canvas resize (call on window resize or panel toggle). */
  resize() {
    this._resize();
    this.draw();
  }

  /** Clear trail and step state (on reset). */
  reset() {
    this.trailPoints = [];
    this.currentStep = null;
    this.draw();
  }

  // ── Private: Setup ──────────────────────────────────────────────────────────

  _resize() {
    const wrapper = this.canvas.parentElement;
    if (!wrapper) return;

    const w = wrapper.clientWidth  || 600;
    const h = wrapper.clientHeight || 380;

    this.canvas.width  = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.W = w;
    this.H = h;
  }

  // ── Private: Coordinate Transform ───────────────────────────────────────────

  _toCanvas(x, val) {
    const { W, H, domain, valueRange } = this;
    const m = MARGIN;
    const plotW = W - m.left - m.right;
    const plotH = H - m.top  - m.bottom;

    const cx = m.left + (x - domain[0]) / (domain[1] - domain[0]) * plotW;
    const cy = m.top  + (1 - (val - valueRange.min) / (valueRange.max - valueRange.min)) * plotH;
    return { cx, cy };
  }

  _cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // ── Private: Drawing Layers ─────────────────────────────────────────────────

  _drawEmpty() {
    const { ctx, W, H } = this;
    ctx.fillStyle = this._cssVar('--canvas-bg') || '#0f172a';
    ctx.fillRect(0, 0, W, H);
  }

  _drawGrid() {
    const { ctx, W, H, domain, valueRange } = this;
    const m = MARGIN;

    // Background
    ctx.fillStyle = this._cssVar('--canvas-bg') || '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = this._cssVar('--canvas-grid') || 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;

    const xTicks = 10;
    const yTicks = 8;

    for (let i = 0; i <= xTicks; i++) {
      const x = domain[0] + (i / xTicks) * (domain[1] - domain[0]);
      const { cx } = this._toCanvas(x, valueRange.min);
      ctx.beginPath();
      ctx.moveTo(cx, m.top);
      ctx.lineTo(cx, H - m.bottom);
      ctx.stroke();
    }
    for (let i = 0; i <= yTicks; i++) {
      const val = valueRange.min + (i / yTicks) * (valueRange.max - valueRange.min);
      const { cy } = this._toCanvas(domain[0], val);
      ctx.beginPath();
      ctx.moveTo(m.left, cy);
      ctx.lineTo(W - m.right, cy);
      ctx.stroke();
    }
  }

  _drawAxes() {
    const { ctx, W, H, domain, valueRange } = this;
    const m = MARGIN;

    ctx.strokeStyle = this._cssVar('--canvas-axis') || 'rgba(255,255,255,0.25)';
    ctx.fillStyle   = this._cssVar('--canvas-axis-text') || 'rgba(255,255,255,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.font        = `11px ${getComputedStyle(document.documentElement).getPropertyValue('--font-code') || 'monospace'}`;
    ctx.textAlign   = 'center';

    // X axis
    const yZero = Math.max(m.top, Math.min(H - m.bottom, this._toCanvas(0, 0).cy));
    ctx.beginPath();
    ctx.moveTo(m.left, yZero);
    ctx.lineTo(W - m.right, yZero);
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(m.left, m.top);
    ctx.lineTo(m.left, H - m.bottom);
    ctx.stroke();

    // X tick labels
    const xTicks = 6;
    for (let i = 0; i <= xTicks; i++) {
      const x = domain[0] + (i / xTicks) * (domain[1] - domain[0]);
      const { cx } = this._toCanvas(x, valueRange.min);
      ctx.fillText(x.toFixed(1), cx, H - m.bottom + 18);
    }

    // Y tick labels
    ctx.textAlign = 'right';
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = valueRange.min + (i / yTicks) * (valueRange.max - valueRange.min);
      const { cy } = this._toCanvas(domain[0], val);
      ctx.fillText(val.toFixed(1), m.left - 8, cy + 4);
    }

    // Axis labels
    ctx.textAlign = 'center';
    ctx.fillText('x', W / 2, H - 6);
    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('f(x)', 0, 0);
    ctx.restore();
  }

  _drawCurve() {
    const { ctx, W, H, domain, objectiveFn } = this;
    const m = MARGIN;

    // Build gradient along the curve
    const grad = ctx.createLinearGradient(m.left, 0, W - m.right, 0);
    const c1 = this._cssVar('--canvas-curve-start') || '#6366f1';
    const c2 = this._cssVar('--canvas-curve-end')   || '#a78bfa';
    grad.addColorStop(0,   c1);
    grad.addColorStop(0.5, c2);
    grad.addColorStop(1,   c1);

    ctx.strokeStyle = grad;
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();

    let first = true;
    for (let i = 0; i <= SAMPLES; i++) {
      const x   = domain[0] + (i / SAMPLES) * (domain[1] - domain[0]);
      const val = objectiveFn(x);
      const { cx, cy } = this._toCanvas(x, val);

      // Clip to plot area
      if (cy < m.top - 2 || cy > H - m.bottom + 2) { first = true; continue; }

      first ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      first = false;
    }
    ctx.stroke();
  }

  _drawOptimumMarker() {
    // Drawn as a faint vertical dashed line at x=0 (only if in domain)
    const { ctx, domain, valueRange } = this;
    if (0 < domain[0] || 0 > domain[1]) return;
    const { cx, cy: cyTop } = this._toCanvas(0, valueRange.max);
    const { cy: cyBot }     = this._toCanvas(0, valueRange.min);

    ctx.strokeStyle = 'rgba(250,204,21,0.15)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cyTop);
    ctx.lineTo(cx, cyBot);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawTrail() {
    const { ctx } = this;
    if (!this.trailPoints.length) return;

    // Draw connecting line
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    this.trailPoints.forEach(({ x, val }, i) => {
      const { cx, cy } = this._toCanvas(x, val);
      i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw dots
    this.trailPoints.forEach(({ x, val, accepted }, i) => {
      const { cx, cy } = this._toCanvas(x, val);
      const isLast = i === this.trailPoints.length - 1;
      const alpha  = 0.3 + 0.5 * (i / this.trailPoints.length);

      ctx.beginPath();
      ctx.arc(cx, cy, isLast ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = accepted
        ? `rgba(34,197,94,${alpha})`
        : `rgba(244,63,94,${alpha})`;
      ctx.fill();
    });
  }

  _drawNeighbor() {
    const { ctx, currentStep } = this;
    if (!currentStep) return;

    const { type, variables } = currentStep;
    if (!['generate', 'evaluate', 'reject'].includes(type)) return;
    if (variables.neighbor_x === null || variables.neighbor_x === undefined) return;

    const x   = variables.neighbor_x;
    const val = (variables.neighbor_val !== null && variables.neighbor_val !== undefined)
      ? variables.neighbor_val
      : this.objectiveFn(x);

    const { cx, cy } = this._toCanvas(x, val);

    const color = type === 'reject'
      ? (this._cssVar('--canvas-rejected') || '#f43f5e')
      : (this._cssVar('--canvas-neighbor') || '#a78bfa');

    // Vertical dashed line to curve
    const { cy: cyOnCurve } = this._toCanvas(x, this.objectiveFn(x));
    ctx.strokeStyle = color + '66';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cyOnCurve);
    ctx.lineTo(cx, this._toCanvas(x, this.valueRange.min).cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dot
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle   = color + '33';
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = color;
    ctx.font      = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`n=${x.toFixed(2)}`, cx, cy - 12);
  }

  _drawCurrent() {
    const { ctx, currentStep } = this;
    if (!currentStep) return;

    const { variables, type } = currentStep;
    const x   = variables.current_x;
    const val = variables.current_val;
    if (x === null || x === undefined) return;

    const { cx, cy } = this._toCanvas(x, val);
    const color = type === 'converge'
      ? (this._cssVar('--canvas-accepted') || '#22c55e')
      : (this._cssVar('--canvas-current')  || '#f59e0b');

    // Glow rings
    for (let r = 24; r >= 8; r -= 8) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = color + Math.floor(((24 - r) / 24) * 30).toString(16).padStart(2, '0');
      ctx.fill();
    }

    // Core dot
    ctx.shadowBlur  = 18;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Vertical drop line
    const { cy: cyBase } = this._toCanvas(x, this.valueRange.min);
    ctx.strokeStyle = color + '55';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy + 8);
    ctx.lineTo(cx, cyBase);
    ctx.stroke();
    ctx.setLineDash([]);

    // Value label
    ctx.fillStyle = color;
    ctx.font      = 'bold 12px monospace';
    ctx.textAlign = 'center';
    const labelY  = cy - 15;
    const label   = `x=${x.toFixed(2)}, f=${val.toFixed(2)}`;
    ctx.fillText(label, cx, labelY < MARGIN.top + 12 ? cy + 22 : labelY);
  }
}
