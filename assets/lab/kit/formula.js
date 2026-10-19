// Formelliste med samme klasser som Hugo-shortcoden formel.
// Ingen DOM-tilgang ved import (joinNames testes i Node).

// Slår sammen navn som shortcoden gjør: «a, b og c». `and` er i18n-ordet (lab.and).
export function joinNames(names, and = 'and') {
  const n = names || [];
  if (n.length < 2) return n.join('');
  return `${n.slice(0, -1).join(', ')} ${and} ${n[n.length - 1]}`;
}

// formulas: { kilde, sideLabel, and, items }. Med collapsible: true pakkes lista
// i <details class="lab-summary"> med `summary` som overskrift.
export function formulaList(formulas, { collapsible = false, summary = '' } = {}) {
  const list = document.createElement('ul');
  list.className = 'lab-formulas';
  const sideLabel = formulas.sideLabel || 's.';
  for (const f of formulas.items || []) {
    const li = document.createElement('li');
    li.dataset.id = f.id;
    const name = document.createElement('strong');
    name.textContent = f.navn;
    const tex = document.createElement('span');
    tex.className = 'formel';
    tex.textContent = f.tekst;
    const src = document.createElement('span');
    src.className = 'formel-kilde';
    src.textContent = f.avledet
      ? joinNames(f.fraNavn, formulas.and)
      : `${formulas.kilde}, ${sideLabel} ${f.side}`;
    li.append(name, tex, src);
    list.append(li);
  }
  if (!collapsible) return list;
  const details = document.createElement('details');
  details.className = 'lab-summary';
  const title = document.createElement('summary');
  title.textContent = summary;
  details.append(title, list);
  return details;
}
