// Wheatstone-bro med PT100: kretsskjema, temperatur og last, måleverdier og kurve.
import { boot } from './kit/boot.js';
import {
  ptResistance, bridge, loaded, sensorCurrent, adc10Steps, ads1115Steps, LOADS, tangentLine,
} from './wheatstone-pt100.math.js';
import { formatNumber, formatSI } from './kit/format.js';
import {
  svg, wire, resistor, battery, node, probe, label,
} from './kit/circuit.js';
import { slider, segmented } from './kit/controls.js';
import { tile } from './kit/readout.js';
import { plot } from './kit/plot.js';
import { formulaList } from './kit/formula.js';
import { summary } from './kit/summary.js';

const K = 'lab.wheatstone-pt100.';
const T_MIN = -50;
const T_MAX = 200;
const T_START = 20;

const mV = (v, lang) => `${formatNumber(v * 1000, 1, lang)} mV`;

// Ren beregning av alt flisene viser. Eksportert så tallene kan sjekkes uten DOM.
export function readings(tC, loadId, lang) {
  const rt = ptResistance(tC);
  const b = bridge({ rt });
  const load = LOADS.find((l) => l.id === loadId) || LOADS[0];
  const vLoad = loaded(b.vOpen, b.rTh, load.ohm);
  return {
    rt,
    vOpen: b.vOpen,
    vLoad,
    rText: formatSI(rt, 'Ω', lang, 2),
    vText: mV(vLoad, lang),
    vOpenText: mV(b.vOpen, lang),
    iText: formatSI(sensorCurrent({ rt }), 'A', lang, 2),
    adc10: adc10Steps(vLoad),
    adc10Text: formatNumber(adc10Steps(vLoad), 0, lang),
    belowZero: vLoad < 0,
    adsText: formatNumber(ads1115Steps(vLoad), 0, lang),
  };
}

// Fargen på sensoren: blå ved −50 °C, oransje ved 200 °C.
function hexToRgb(hex, fallback) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = parseInt(m ? m[1] : fallback, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function sensorColor(tC) {
  const css = getComputedStyle(document.documentElement);
  const cold = hexToRgb(css.getPropertyValue('--lab-low'), '2064c8');
  const hot = hexToRgb(css.getPropertyValue('--lab-sensor'), 'd4600a');
  const f = (tC - T_MIN) / (T_MAX - T_MIN);
  const c = cold.map((v, i) => Math.round(v + (hot[i] - v) * f));
  return `rgb(${c.join(',')})`;
}

function drawCircuit(lang, ariaLabel) {
  const s = svg('0 0 400 250');
  s.setAttribute('aria-label', ariaLabel);
  const top = 30;
  const bot = 220;
  const mid = 125;
  const xb = 60;
  const xl = 150;
  const xr = 270;
  // Forsyning og skinner
  wire(s, [[xb, mid - 6], [xb, top], [xr, top]], 'high');
  wire(s, [[xb, mid + 6], [xb, bot], [xr, bot]], 'copper');
  battery(s, xb, mid, { label: formatSI(3.3, 'V', lang, 1) });
  // Venstre deler R1 over R2, høyre deler R3 over PT100
  resistor(s, xl, top, xl, mid, { label: `R1 ${formatSI(2200, 'Ω', lang, 1)}` });
  resistor(s, xl, mid, xl, bot, { label: `R2 ${formatSI(100, 'Ω', lang, 0)}` });
  resistor(s, xr, top, xr, mid, { label: `R3 ${formatSI(2200, 'Ω', lang, 1)}` });
  const pt = resistor(s, xr, mid, xr, bot, { label: 'PT100', cls: 'sensor' });
  // Måling mellom A og B
  wire(s, [[xl, mid], [xr, mid]], 'low').classList.add('lab-dashed');
  node(s, xl, top, 'high');
  node(s, xr, top, 'high');
  node(s, xl, bot);
  node(s, xr, bot);
  node(s, xl, mid, 'low');
  node(s, xr, mid, 'low');
  label(s, xl - 8, mid - 8, 'A', { anchor: 'end' });
  label(s, xr - 8, mid - 8, 'B', { anchor: 'end' });
  probe(s, (xl + xr) / 2, mid, 'V');
  return { el: s, pt, ptLabel: pt.querySelector('text') };
}

export function mount(root, ctx) {
  const lang = ctx.lang || 'en';
  const S = (k) => (ctx.strings || {})[K + k] || '';
  let tC = T_START;
  let loadId = LOADS[0].id;

  const wrap = document.createElement('div');
  wrap.className = 'lab-wb';

  const circuit = drawCircuit(lang, S('circuitLabel'));
  const left = document.createElement('div');
  left.className = 'lab-wb-left';
  left.append(circuit.el);

  const temp = slider({
    label: S('temperature'), min: T_MIN, max: T_MAX, step: 1, value: T_START, unit: '°C', lang,
    onInput: (v) => { tC = v; update(); },
  });
  const load = segmented({
    label: S('load'),
    options: LOADS.map((l) => ({ id: l.id, label: S(`load.${l.id}`) })),
    value: loadId,
    onChange: (id) => { loadId = id; update(); },
  });
  left.append(temp.el, load.el);

  const tiles = document.createElement('div');
  tiles.className = 'lab-tiles';
  const tR = tile({ label: S('rpt') });
  const tV = tile({ label: S('vout') });
  const tI = tile({ label: S('current') });
  const tA = tile({ label: S('adc10') });
  const tD = tile({ label: S('ads1115') });
  // Utgangsspenningen er poenget, så den får hovedflisen øverst. Resten i et 2×2-rutenett.
  tV.el.classList.add('lab-tile--primary');
  tiles.append(tV.el, tR.el, tI.el, tA.el, tD.el);

  const top = document.createElement('div');
  top.className = 'lab-wb-grid';
  top.append(left, tiles);

  const samples = [];
  for (let t = T_MIN; t <= T_MAX; t++) {
    samples.push([t, bridge({ rt: ptResistance(t) }).vOpen * 1000]);
  }
  // Stiplet referanse: rett linje med samme stigning som kurven ved 0 °C.
  // Avstanden til kurven er krumningen, ca. 3,4 mV ved 200 °C.
  const tangent = tangentLine(0);
  const chart = plot({
    xLabel: S('plotX'),
    yLabel: S('plotY'),
    xDomain: [T_MIN, T_MAX],
    yDomain: [-40, 120],
    ticks: [-50, 0, 50, 100, 150, 200],
    samples,
    reference: [[T_MIN, tangent(T_MIN) * 1000], [T_MAX, tangent(T_MAX) * 1000]],
    referenceLabel: S('plotRef'),
    lang,
  });

  const formulas = formulaList(ctx.formulas || {}, {
    collapsible: true, summary: S('formulasTitle'),
  });

  wrap.append(top, chart.el, formulas, summary(S('summaryTitle'), S('summaryBody')));
  root.append(wrap);

  function update() {
    const r = readings(tC, loadId, lang);
    circuit.ptLabel.textContent = `PT100 ${formatSI(r.rt, 'Ω', lang, 1)}`;
    circuit.pt.style.color = sensorColor(tC);
    tR.set(r.rText);
    tV.set(r.vText, loadId === 'dmm' ? '' : `${S('openCircuit')} ${r.vOpenText}`);
    tI.set(r.iText);
    tA.set(r.adc10Text, r.belowZero ? S('belowZero') : S('adc10Note'));
    tD.set(r.adsText, S('ads1115Note'));
    chart.mark(tC, r.vOpen * 1000);
  }
  update();
}

boot('wheatstone-pt100', mount);
