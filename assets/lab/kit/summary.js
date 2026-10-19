// Utfoldbar forklaring. html er pålitelig markup fra i18n.
export function summary(title, html) {
  const d = document.createElement('details');
  d.className = 'lab-summary';
  const s = document.createElement('summary');
  s.textContent = title;
  const body = document.createElement('div');
  body.className = 'lab-summary-body';
  body.innerHTML = html;
  d.append(s, body);
  return d;
}
