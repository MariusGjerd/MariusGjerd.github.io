import test from 'node:test';
import assert from 'node:assert/strict';
import { scale } from '../../assets/lab/kit/plot.js';

test('scale maps domain ends and middle', () => {
  const f = scale(-50, 200, 0, 250);
  assert.equal(f(-50), 0);
  assert.equal(f(200), 250);
  assert.equal(f(75), 125);
});

test('scale supports inverted range', () => {
  assert.equal(scale(0, 1, 100, 0)(0.25), 75);
});

test('tickValues: antall intervaller gir jevne tikk med endepunkter', async () => {
  const { tickValues } = await import('../../assets/lab/kit/plot.js');
  assert.deepEqual(tickValues([-40, 120], 4), [-40, 0, 40, 80, 120]);
  assert.deepEqual(tickValues([-50, 200], 5), [-50, 0, 50, 100, 150, 200]);
  assert.deepEqual(tickValues([0, 1]), [0, 0.25, 0.5, 0.75, 1]);
});

test('tickValues: eksplisitt liste filtreres til domenet', async () => {
  const { tickValues } = await import('../../assets/lab/kit/plot.js');
  assert.deepEqual(tickValues([-50, 200], [-100, -50, 0, 50, 100, 150, 200, 250]), [-50, 0, 50, 100, 150, 200]);
});
