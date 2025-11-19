(function () {
  const STORAGE_KEY = 'site-theme';
  const MEDIA = '(prefers-color-scheme: dark)';
  const mql = window.matchMedia ? window.matchMedia(MEDIA) : null;
  function get() { try { return localStorage.getItem(STORAGE_KEY) || 'system'; } catch { return 'system'; } }
  function apply(pref = get()) {
    const html = document.documentElement;
    html.classList.remove('theme-light','theme-dark','theme-high-contrast');
    if (pref === 'light' || pref === 'dark' || pref === 'high-contrast') html.classList.add('theme-'+pref);
    html.style.colorScheme = (pref === 'dark' || pref === 'high-contrast') ? 'dark' : (pref === 'light' ? 'light' : '');
  }
  function set(pref) { try { localStorage.setItem(STORAGE_KEY, pref); } catch {} apply(pref); try { window.dispatchEvent(new CustomEvent('themechange',{detail:{theme:pref}})); } catch {} }
  apply(get());
  if (mql && mql.addEventListener) mql.addEventListener('change', () => { if (get() === 'system') apply('system'); });
  else if (mql && mql.addListener) mql.addListener(() => { if (get() === 'system') apply('system'); });
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) apply(e.newValue || 'system'); });
  window.Theme = { get, set, apply };
})();
