// Enkelt linjediagram på canvas. Ingen DOM-tilgang ved import (testes i Node).
import { formatNumber } from './format.js';

export function scale(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin;
  return (x) => rangeMin + ((x - domainMin) / span) * (rangeMax - rangeMin);
}

// Tikkverdier for en akse. `ticks` er antall intervaller (jevnt fordelt, med
// begge endepunkter) eller en eksplisitt liste. Verdier utenfor domenet tas bort.
export function tickValues(domain, ticks = 4) {
  const [lo, hi] = domain;
  if (Array.isArray(ticks)) {
    const a = Math.min(lo, hi);
    const b = Math.max(lo, hi);
    return ticks.filter((v) => v >= a && v <= b);
  }
  const n = Math.max(1, Math.round(ticks));
  return Array.from({ length: n + 1 }, (_, i) => lo + ((hi - lo) * i) / n);
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// Delt tema-observer, opprettes først ved første plot() (import er DOM-fri).
const themeCallbacks = new Set();
let themeObserver = null;
function onTheme(cb) {
  if (!themeObserver && typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(() => themeCallbacks.forEach((f) => f()));
    themeObserver.observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme'],
    });
  }
  themeCallbacks.add(cb);
  return () => themeCallbacks.delete(cb);
}

// reference: valgfri ekstra serie [[x, y], ...] som tegnes stiplet, med
// referenceLabel som forklaring øverst til venstre.
// ticks / yTicks: se tickValues (standard 4 intervaller).
export function plot({
  xLabel, yLabel, xDomain, yDomain, samples, lang = 'en',
  reference = null, referenceLabel = '', ticks = 4, yTicks = 4,
}) {
  const el = document.createElement('div');
  el.className = 'lab-plot';
  const canvas = document.createElement('canvas');
  canvas.className = 'lab-plot-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${yLabel} / ${xLabel}`);
  el.append(canvas);
  let marker = null;
  let frame = 0;
  let lastW = 0;
  let lastDpr = 0;
  let lastH = 0;

  function draw() {
    frame = 0;
    const w = el.clientWidth || 320;
    const hgt = Math.round(Math.min(260, w * 0.6));
    const dpr = window.devicePixelRatio || 1;
    if (w !== lastW || dpr !== lastDpr || hgt !== lastH) {
      lastW = w; lastDpr = dpr; lastH = hgt;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hgt * dpr);
      canvas.style.height = `${hgt}px`;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    const m = { l: 46, r: 12, t: 10, b: 34 };
    const sx = scale(xDomain[0], xDomain[1], m.l, w - m.r);
    const sy = scale(yDomain[0], yDomain[1], hgt - m.b, m.t);
    const fg = cssVar('--secondary', '#666');
    const grid = cssVar('--border', '#ddd');
    const line = cssVar('--lab-low', '#2064c8');
    const mark = cssVar('--primary', '#1e1e1e');
    ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
    ctx.lineWidth = 1;
    ctx.strokeStyle = grid;
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    for (const xv of tickValues(xDomain, ticks)) {
      ctx.beginPath();
      ctx.moveTo(sx(xv), m.t); ctx.lineTo(sx(xv), hgt - m.b);
      ctx.stroke();
      ctx.fillText(formatNumber(xv, 0, lang), sx(xv), hgt - m.b + 14);
    }
    ctx.textAlign = 'right';
    for (const yv of tickValues(yDomain, yTicks)) {
      ctx.beginPath();
      ctx.moveTo(m.l, sy(yv)); ctx.lineTo(w - m.r, sy(yv));
      ctx.stroke();
      ctx.fillText(formatNumber(yv, Math.abs(yDomain[1]) < 10 ? 1 : 0, lang), m.l - 5, sy(yv) + 4);
    }
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, (m.l + w - m.r) / 2, hgt - 4);
    ctx.save();
    ctx.translate(11, (m.t + hgt - m.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
    if (reference && reference.length) {
      ctx.save();
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      reference.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
      ctx.stroke();
      if (referenceLabel) {
        const ly = m.t + 12;
        ctx.beginPath();
        ctx.moveTo(m.l + 8, ly - 4); ctx.lineTo(m.l + 30, ly - 4);
        ctx.stroke();
        ctx.textAlign = 'left';
        ctx.fillStyle = fg;
        ctx.fillText(referenceLabel, m.l + 36, ly);
      }
      ctx.restore();
    }
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
    ctx.stroke();
    if (marker) {
      ctx.fillStyle = mark;
      ctx.beginPath();
      ctx.arc(sx(marker[0]), sy(marker[1]), 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };
  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(schedule);
    ro.observe(el);
  }
  const offTheme = onTheme(schedule);
  schedule();

  return {
    el,
    mark(x, y) {
      marker = [x, y];
      canvas.setAttribute('aria-label',
        `${yLabel} ${formatNumber(y, 2, lang)} ${lang === 'en' ? 'at' : 'ved'} ${xLabel} ${formatNumber(x, 1, lang)}`);
      schedule();
    },
    destroy() {
      if (ro) ro.disconnect();
      offTheme();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
