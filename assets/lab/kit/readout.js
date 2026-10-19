// Måleverdi-flis. aria-live gjør at skjermlesere leser opp endringer.
export function tile({ label }) {
  const el = document.createElement('div');
  el.className = 'lab-tile';
  const l = document.createElement('div');
  l.className = 'lab-tile-label';
  l.textContent = label;
  const v = document.createElement('div');
  v.className = 'lab-tile-value';
  v.setAttribute('aria-live', 'polite');
  v.setAttribute('aria-atomic', 'true');
  const n = document.createElement('div');
  n.className = 'lab-tile-note';
  el.append(l, v, n);
  return {
    el,
    set(text, note = '') {
      v.textContent = text;
      n.textContent = note;
      n.hidden = !note;
    },
  };
}
