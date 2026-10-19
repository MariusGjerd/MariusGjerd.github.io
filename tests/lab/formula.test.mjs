import test from 'node:test';
import assert from 'node:assert/strict';
import { joinNames } from '../../assets/lab/kit/formula.js';

test('joinNames følger shortcoden: komma og i18n-ord før siste ledd', () => {
  assert.equal(joinNames([], 'og'), '');
  assert.equal(joinNames(['a'], 'og'), 'a');
  assert.equal(joinNames(['a', 'b'], 'og'), 'a og b');
  assert.equal(joinNames(['a', 'b', 'c'], 'and'), 'a, b and c');
});
