import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatSI, e12 } from '../../assets/lab/kit/format.js';

test('desimalkomma på norsk', () => assert.equal(formatNumber(52.0, 1, 'no'), '52,0'));
test('punktum på engelsk', () => assert.equal(formatNumber(52.0, 1, 'en'), '52.0'));
test('ingen minus-null', () => assert.equal(formatNumber(-0.00001, 1, 'no'), '0,0'));
test('millivolt', () => assert.equal(formatSI(0.051968, 'V', 'no'), '52,0 mV'));
test('kiloohm', () => assert.equal(formatSI(2200, 'Ω', 'en'), '2.2 kΩ'));
test('megaohm', () => assert.equal(formatSI(10e6, 'Ω', 'no', 0), '10 MΩ'));
test('negativ millivolt', () => assert.equal(formatSI(-0.026642, 'V', 'no'), '−26,6 mV'));
test('E12', () => {
  assert.equal(e12(2300), 2200);
  assert.equal(e12(9100), 8200);
  assert.equal(e12(47), 47);
});
