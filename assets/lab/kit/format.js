// Number formatting for the lab widgets. Pure functions, no DOM.

const MINUS = '−';
const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
// Ordered from smallest to largest; each entry is [power of ten, prefix].
const SI_PREFIXES = [
  [-6, 'µ'],
  [-3, 'm'],
  [0, ''],
  [3, 'k'],
  [6, 'M'],
];

/**
 * Formats a number with a fixed number of decimals.
 * "no" uses a decimal comma, "en" a decimal point. Negative numbers use U+2212.
 * A value that rounds to zero is shown without a sign.
 */
export function formatNumber(value, decimals, lang) {
  const separator = lang === 'en' ? '.' : ',';
  const digits = Math.abs(value).toFixed(decimals);
  const isZero = parseFloat(digits) === 0;
  const sign = value < 0 && !isZero ? MINUS : '';
  return sign + digits.replace('.', separator);
}

/**
 * Formats a value with an SI prefix (µ, m, none, k, M) so the mantissa is
 * between 1 and 999. Zero gets no prefix. Output: "52,0 mV".
 */
export function formatSI(value, unit, lang, decimals = 1) {
  const magnitude = Math.abs(value);
  const NO_PREFIX = SI_PREFIXES.findIndex(([exp]) => exp === 0);
  let index = magnitude === 0 ? NO_PREFIX : 0;
  if (magnitude !== 0) {
    for (let i = 0; i < SI_PREFIXES.length; i++) {
      if (magnitude >= 10 ** SI_PREFIXES[i][0]) index = i;
    }
  }

  const mantissaFor = (i) => {
    const exp = SI_PREFIXES[i][0];
    const scaled = exp < 0 ? magnitude * 10 ** -exp : magnitude / 10 ** exp;
    return Math.sign(value) * scaled;
  };

  let mantissa = mantissaFor(index);
  // Rounding can push the mantissa to 1000 (e.g. 999.96 mV); use the next prefix then.
  if (Math.abs(parseFloat(mantissa.toFixed(decimals))) >= 1000 && index < SI_PREFIXES.length - 1) {
    index += 1;
    mantissa = mantissaFor(index);
  }

  const prefix = SI_PREFIXES[index][1];
  return `${formatNumber(mantissa, decimals, lang)} ${prefix}${unit}`;
}

/**
 * Returns the nearest E12 series value (times a power of ten).
 * Ties go to the smaller value, so e12(9100) === 8200.
 */
export function e12(value) {
  if (value === 0 || !Number.isFinite(value)) return value;
  const sign = Math.sign(value);
  const magnitude = Math.abs(value);

  let exp = Math.floor(Math.log10(magnitude));
  if (10 ** (exp + 1) <= magnitude) exp += 1;
  if (10 ** exp > magnitude) exp -= 1;

  // Candidates: the E12 values in this decade, plus 1.0 in the next decade.
  const candidates = [...E12.map((m) => Number(`${m}e${exp}`)), 10 ** (exp + 1)];

  let best = candidates[0];
  let bestDistance = Math.abs(magnitude - best);
  for (const candidate of candidates.slice(1)) {
    const distance = Math.abs(magnitude - candidate);
    // Strict comparison with a small tolerance, so an exact tie keeps the smaller value.
    if (distance < bestDistance - 1e-12 * magnitude) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return sign * best;
}
