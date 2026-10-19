// SVG-primitiver for kretsskjemaer. Farge via klassen lab-c-{cls}.
const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

function text(svg, x, y, str, cls = 'lab-svg-label', anchor = 'middle') {
  const t = el('text', { x, y, class: cls, 'text-anchor': anchor }, svg);
  t.textContent = str;
  return t;
}

// Fri tekstetikett i skjemaet, f.eks. navn på et knutepunkt.
// opts: { anchor = 'middle', cls = 'lab-svg-label' }.
export function label(parent, x, y, str, { anchor = 'middle', cls = 'lab-svg-label' } = {}) {
  return text(parent, x, y, str, cls, anchor);
}

export function svg(viewBox) {
  return el('svg', {
    viewBox,
    class: 'lab-circuit',
    role: 'img',
    preserveAspectRatio: 'xMidYMid meet',
  });
}

export function wire(parent, points, cls = 'copper') {
  return el('polyline', {
    points: points.map((p) => p.join(',')).join(' '),
    class: `lab-wire lab-c-${cls}`,
    fill: 'none',
  }, parent);
}

export function resistor(parent, x1, y1, x2, y2, { label = '', cls = 'copper' } = {}) {
  const g = el('g', { class: `lab-resistor lab-c-${cls}` }, parent);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const body = Math.min(40, len * 0.5);
  const lead = (len - body) / 2;
  const inner = el('g', { transform: `translate(${x1} ${y1}) rotate(${angle})` }, g);
  el('polyline', {
    points: `0,0 ${lead},0`, class: 'lab-wire', fill: 'none',
  }, inner);
  el('polyline', {
    points: `${lead + body},0 ${len},0`, class: 'lab-wire', fill: 'none',
  }, inner);
  el('rect', {
    x: lead, y: -8, width: body, height: 16, class: 'lab-resistor-body', rx: 2,
  }, inner);
  if (label) {
    const vertical = Math.abs(dy) > Math.abs(dx);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    if (vertical) text(g, mx + 16, my + 4, label, 'lab-svg-label', 'start');
    else text(g, mx, my - 14, label);
  }
  return g;
}

export function battery(parent, x, y, { label = '' } = {}) {
  const g = el('g', { class: 'lab-battery lab-c-high' }, parent);
  el('line', { x1: x - 12, y1: y - 6, x2: x + 12, y2: y - 6, class: 'lab-wire' }, g);
  el('line', { x1: x - 6, y1: y + 6, x2: x + 6, y2: y + 6, class: 'lab-wire' }, g);
  text(g, x + 16, y - 9, '+', 'lab-svg-label', 'start');
  if (label) text(g, x - 18, y + 4, label, 'lab-svg-label', 'end');
  return g;
}

export function node(parent, x, y, cls = 'copper') {
  return el('circle', { cx: x, cy: y, r: 4, class: `lab-node lab-c-${cls}` }, parent);
}

export function probe(parent, x, y, label = '') {
  const g = el('g', { class: 'lab-probe lab-c-low' }, parent);
  el('circle', { cx: x, cy: y, r: 11, class: 'lab-probe-ring' }, g);
  text(g, x, y + 4, label || 'V', 'lab-probe-text');
  return g;
}
