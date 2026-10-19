// Kontroller basert på native elementer, så tastatur og skjermleser fungerer.
import { formatNumber, formatSI, e12 } from './format.js';

let uid = 0;
const nextId = (p) => `${p}-${++uid}`;

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids) e.append(k);
  return e;
}

export function slider({
  label, min, max, step, value, unit = '', lang = 'en', snapE12 = false, onInput,
}) {
  const id = nextId('lab-slider');
  const input = h('input', { type: 'range', id, min, max, step, class: 'lab-range' });
  const out = h('output', { for: id, class: 'lab-value' });
  const el = h('div', { class: 'lab-control' },
    h('label', { for: id, class: 'lab-label' }, label), out, input);
  const show = (v) => {
    out.textContent = unit === 'Ω' || unit === 'V'
      ? formatSI(v, unit, lang, unit === 'V' ? 2 : 1)
      : `${formatNumber(v, step < 1 ? 1 : 0, lang)} ${unit}`.trim();
  };
  const set = (v) => {
    input.value = v;
    show(Number(input.value));
  };
  input.addEventListener('input', () => {
    let v = Number(input.value);
    if (snapE12 && v > 0) {
      v = Math.min(max, Math.max(min, e12(v)));
      input.value = v;
    }
    show(v);
    if (onInput) onInput(v);
  });
  set(value);
  return { el, set };
}

export function segmented({ label, options, value, onChange }) {
  const group = h('div', { class: 'lab-segmented', role: 'group', 'aria-label': label });
  const buttons = new Map();
  const set = (id) => {
    for (const [oid, b] of buttons) b.setAttribute('aria-pressed', String(oid === id));
  };
  for (const o of options) {
    const b = h('button', { type: 'button', class: 'lab-seg-btn' }, o.label);
    b.addEventListener('click', () => {
      set(o.id);
      if (onChange) onChange(o.id);
    });
    buttons.set(o.id, b);
    group.append(b);
  }
  const el = h('div', { class: 'lab-control' }, h('span', { class: 'lab-label' }, label), group);
  set(value);
  return { el, set };
}

export function toggle({ label, value, onChange }) {
  const id = nextId('lab-toggle');
  const input = h('input', { type: 'checkbox', id, class: 'lab-check' });
  const el = h('div', { class: 'lab-control lab-toggle' }, input, h('label', { for: id, class: 'lab-label' }, label));
  input.addEventListener('change', () => { if (onChange) onChange(input.checked); });
  const set = (b) => { input.checked = Boolean(b); };
  set(value);
  return { el, set };
}
