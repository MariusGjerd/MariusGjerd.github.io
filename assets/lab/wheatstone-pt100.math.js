// Wheatstone-bro med PT100. Ren fysikk, ingen DOM.
const par = (a, b) => (a * b) / (a + b);

export function ptResistance(tC, r0 = 100, alpha = 0.00385) {
  return r0 * (1 + alpha * tC);
}

export function bridge({ vs = 3.3, r1 = 2200, r2 = 100, r3 = 2200, rt } = {}) {
  const vLeft = (vs * r2) / (r1 + r2);
  const vRight = (vs * rt) / (r3 + rt);
  return { vLeft, vRight, vOpen: vRight - vLeft, rTh: par(r1, r2) + par(r3, rt) };
}

// Stigningen dU/dt (V per °C) til broutgangen ved tC, regnet analytisk:
// dU/dRt = vs · r3 / (r3 + rt)², og dRt/dt = r0 · alpha.
export function bridgeSlope(tC, {
  vs = 3.3, r3 = 2200, r0 = 100, alpha = 0.00385,
} = {}) {
  const rt = ptResistance(tC, r0, alpha);
  return ((vs * r3) / ((r3 + rt) ** 2)) * r0 * alpha;
}

// Tangenten til kurven ved t0 (standard 0 °C), som funksjon av t. Gir volt.
export function tangentLine(t0 = 0, opts = {}) {
  const k = bridgeSlope(t0, opts);
  const { vs = 3.3, r1 = 2200, r2 = 100, r3 = 2200, r0 = 100, alpha = 0.00385 } = opts;
  const u0 = bridge({ vs, r1, r2, r3, rt: ptResistance(t0, r0, alpha) }).vOpen;
  return (t) => u0 + k * (t - t0);
}

export function loaded(vOpen, rTh, rLoad) {
  return (vOpen * rLoad) / (rLoad + rTh);
}

export function sensorCurrent({ vs = 3.3, r3 = 2200, rt } = {}) {
  return vs / (r3 + rt);
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function adc10Steps(v, vref = 5) {
  return clamp(Math.round((v * 1024) / vref), 0, 1023);
}

export function ads1115Steps(v, fsr = 0.256) {
  return clamp(Math.round((v / fsr) * 32768), -32768, 32767);
}

export const LOADS = [
  { id: 'dmm', ohm: 10e6 },
  { id: 'ads1115', ohm: 710e3 },
  { id: 'r1k', ohm: 1000 },
];
