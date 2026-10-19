// Felles oppstart: finn alle .lab-widget[data-lab="<slug>"], les JSON fra
// .lab-config og kall mount(root, config) én gang per instans.
export function boot(slug, mount) {
  const run = () => {
    document.querySelectorAll(`.lab-widget[data-lab="${slug}"]`).forEach((root) => {
      if (root.dataset.labMounted) return;
      const cfgEl = root.querySelector('script.lab-config');
      let config = {};
      try { config = JSON.parse(cfgEl ? cfgEl.textContent : '{}'); } catch (e) { /* tom konfig */ }
      root.dataset.labMounted = '1';
      root.querySelector('noscript')?.remove();
      mount(root, config);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}
