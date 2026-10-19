import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ptResistance, bridge, loaded, sensorCurrent, adc10Steps, ads1115Steps, LOADS,
  bridgeSlope, tangentLine,
} from '../../assets/lab/wheatstone-pt100.math.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b} (tol ${tol})`);

test('PT100', () => { near(ptResistance(0), 100, 1e-9); near(ptResistance(100), 138.5, 1e-9); near(ptResistance(-50), 80.75, 1e-9); });
test('balanse ved 0 °C', () => near(bridge({ rt: 100 }).vOpen, 0, 1e-12));
test('kontrollverdier', () => {
  near(bridge({ rt: ptResistance(-50) }).vOpen * 1e3, -26.642, 0.001);
  near(bridge({ rt: ptResistance(100) }).vOpen * 1e3, 51.968, 0.001);
  near(bridge({ rt: ptResistance(200) }).vOpen * 1e3, 102.252, 0.001);
});
test('Thevenin-motstand', () => { near(bridge({ rt: 100 }).rTh, 191.30, 0.01); near(bridge({ rt: 138.5 }).rTh, 225.95, 0.01); });
test('lasteffekt', () => {
  const b = bridge({ rt: 138.5 });
  near(loaded(b.vOpen, b.rTh, 1000) * 1e3, 42.39, 0.01);
  near(loaded(b.vOpen, b.rTh, 710e3) * 1e3, 51.951, 0.001);
});
test('Thevenin lik direkte beregning', () => {
  const vs = 3.3, r1 = 2200, r2 = 100, r3 = 2200, rt = 138.5, rl = 1000;
  // KCL i venstre (vL) og høyre (vR) midtpunkt, RL mellom dem:
  // vL(1/r1+1/r2+1/rl) - vR/rl = vs/r1
  // -vL/rl + vR(1/r3+1/rt+1/rl) = vs/r3
  const a = 1 / r1 + 1 / r2 + 1 / rl, b = -1 / rl;
  const c = -1 / rl, d = 1 / r3 + 1 / rt + 1 / rl;
  const e = vs / r1, f = vs / r3;
  const det = a * d - b * c;
  const vL = (e * d - b * f) / det;
  const vR = (a * f - c * e) / det;
  const br = bridge({ vs, r1, r2, r3, rt });
  near(vR - vL, loaded(br.vOpen, br.rTh, rl), 1e-9);
});
test('sensorstrøm under 2 mA i hele området', () => { for (let t = -50; t <= 200; t += 10) assert.ok(sensorCurrent({ rt: ptResistance(t) }) < 0.002); });
test('10-bit ADC', () => { assert.equal(adc10Steps(0.051968), 11); assert.equal(adc10Steps(0.102252), 21); assert.equal(adc10Steps(-0.026642), 0); });
test('ADS1115', () => { assert.equal(ads1115Steps(0.051968), 6652); assert.equal(ads1115Steps(-0.026642), -3410); assert.equal(ads1115Steps(1), 32767); });
test('LOADS', () => { assert.deepEqual(LOADS.map((l) => l.id), ['dmm', 'ads1115', 'r1k']); });
test('stigning ved 0 °C', () => {
  // vs · r3 / (r3 + r0)² · r0 · alpha = 3,3 · 2200 / 2300² · 0,385
  near(bridgeSlope(0) * 1e3, 0.528374, 1e-6);
  // Tallderivert som kontroll
  const h = 1e-3;
  const num = (bridge({ rt: ptResistance(h) }).vOpen - bridge({ rt: ptResistance(-h) }).vOpen) / (2 * h);
  near(bridgeSlope(0), num, 1e-9);
});
test('tangent ved 0 °C og gapet ved 200 °C', () => {
  const tan = tangentLine(0);
  near(tan(0), 0, 1e-12);
  near(tan(200) * 1e3, 105.675, 0.001);
  const gap = tan(200) - bridge({ rt: ptResistance(200) }).vOpen;
  near(gap * 1e3, 3.42, 0.01); // ca. 3,4 mV
  near(gap / bridgeSlope(0), 6.48, 0.01); // ca. 6,5 °C
});
