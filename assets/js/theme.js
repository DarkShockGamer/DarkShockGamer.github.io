(function () {
  const STORAGE_KEY = 'site-theme';
  const ADAPTIVE_KEY = 'site-adaptive-theme';
  const MEDIA = '(prefers-color-scheme: dark)';
  const mql = window.matchMedia ? window.matchMedia(MEDIA) : null;
  
  // Get stored theme preference
  function get() { 
    try { 
      return localStorage.getItem(STORAGE_KEY) || 'system'; 
    } catch { 
      return 'system'; 
    } 
  }
  
  // Get stored adaptive theme (sunrise, daylight, sunset, midnight)
  function getAdaptive() {
    try {
      return localStorage.getItem(ADAPTIVE_KEY) || null;
    } catch {
      return null;
    }
  }
  
  // Set adaptive theme
  function setAdaptive(adaptiveTheme) {
    try {
      if (adaptiveTheme) {
        localStorage.setItem(ADAPTIVE_KEY, adaptiveTheme);
      } else {
        localStorage.removeItem(ADAPTIVE_KEY);
      }
    } catch {}
  }
  
  // Apply theme to page
  function apply(pref = get()) {
    const html = document.documentElement;
    
    // Remove all theme classes
    html.classList.remove('theme-light', 'theme-dark', 'theme-high-contrast', 'theme-sunrise', 'theme-daylight', 'theme-sunset', 'theme-midnight');
    
    // Check if there's an adaptive theme set
    const adaptiveTheme = getAdaptive();
    if (adaptiveTheme && ['sunrise', 'daylight', 'sunset', 'midnight'].includes(adaptiveTheme)) {
      html.classList.add('theme-' + adaptiveTheme);
      // Set appropriate color scheme based on adaptive theme
      const isDark = adaptiveTheme === 'sunset' || adaptiveTheme === 'midnight';
      html.style.colorScheme = isDark ? 'dark' : 'light';
    } else if (pref === 'light' || pref === 'dark' || pref === 'high-contrast') {
      html.classList.add('theme-' + pref);
      html.style.colorScheme = (pref === 'dark' || pref === 'high-contrast') ? 'dark' : 'light';
    } else {
      // System preference
      html.style.colorScheme = '';
    }
  }
  
  // Set theme preference
  function set(pref, adaptiveTheme = null) { 
    try { 
      localStorage.setItem(STORAGE_KEY, pref); 
    } catch {} 
    
    if (adaptiveTheme !== null) {
      setAdaptive(adaptiveTheme);
    }
    
    apply(pref); 
    
    try { 
      window.dispatchEvent(new CustomEvent('themechange', {detail: {theme: pref, adaptive: adaptiveTheme}})); 
    } catch {} 
  }
  
  // Initialize theme on load
  apply(get());
  
  // Listen for system preference changes
  if (mql && mql.addEventListener) {
    mql.addEventListener('change', () => { if (get() === 'system' && !getAdaptive()) apply('system'); });
  } else if (mql && mql.addListener) {
    mql.addListener(() => { if (get() === 'system' && !getAdaptive()) apply('system'); });
  }
  
  // Listen for storage changes
  window.addEventListener('storage', (e) => { 
    if (e.key === STORAGE_KEY || e.key === ADAPTIVE_KEY) {
      apply(get()); 
    }
  });
  
  // Export API
  window.Theme = { get, set, apply, getAdaptive, setAdaptive };
})();
