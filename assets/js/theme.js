(function () {
  const STORAGE_KEY = 'site-theme';
  const ADAPTIVE_KEY = 'site-adaptive-theme';
  const MEDIA = '(prefers-color-scheme: dark)';
  const mql = window.matchMedia ? window.matchMedia(MEDIA) : null;
  
  // Valid adaptive theme values (new system) - all 8 themes supported
  const VALID_ADAPTIVE_THEMES = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark', 'neon', 'oled', 'paper', 'retro-crt'];
  
  // Migration map: old adaptive themes -> new adaptive themes
  const MIGRATION_MAP = {
    'sunrise': 'light',
    'daylight': 'light',
    'sunset': 'dark',
    'midnight': 'dark'
  };
  
  // Get stored theme preference
  function get() { 
    try { 
      return localStorage.getItem(STORAGE_KEY) || 'system'; 
    } catch { 
      return 'system'; 
    } 
  }
  
  // Get stored adaptive theme (light, dark, high-contrast-light, high-contrast-dark)
  // Automatically migrates old values if found
  function getAdaptive() {
    try {
      let adaptiveTheme = localStorage.getItem(ADAPTIVE_KEY);
      
      if (!adaptiveTheme) {
        return null;
      }
      
      // Check if it's a valid new theme
      if (VALID_ADAPTIVE_THEMES.includes(adaptiveTheme)) {
        return adaptiveTheme;
      }
      
      // Check if it's an old theme that needs migration
      if (MIGRATION_MAP[adaptiveTheme]) {
        const migratedTheme = MIGRATION_MAP[adaptiveTheme];
        // Automatically migrate to new theme
        localStorage.setItem(ADAPTIVE_KEY, migratedTheme);
        return migratedTheme;
      }
      
      // Invalid theme, remove it
      localStorage.removeItem(ADAPTIVE_KEY);
      return null;
    } catch {
      return null;
    }
  }
  
  // Set adaptive theme
  function setAdaptive(adaptiveTheme) {
    try {
      if (adaptiveTheme && VALID_ADAPTIVE_THEMES.includes(adaptiveTheme)) {
        localStorage.setItem(ADAPTIVE_KEY, adaptiveTheme);
      } else {
        localStorage.removeItem(ADAPTIVE_KEY);
      }
    } catch {}
  }
  
  // Check if current page should be excluded from theming
  function isExcludedPage() {
    const path = window.location.pathname;
    // Exclude index.html and sponsors/index.html from theming
    return path === '/' || path === '/index.html' || 
           path === '/sponsors' || path === '/sponsors/' || path === '/sponsors/index.html';
  }
  
  // Apply theme to page
  function apply(pref = get()) {
    const html = document.documentElement;
    
    // Remove all theme classes (including old ones for cleanup)
    html.classList.remove('theme-light', 'theme-dark', 'theme-high-contrast', 
                          'theme-high-contrast-light', 'theme-high-contrast-dark',
                          'theme-neon', 'theme-oled', 'theme-paper', 'theme-retro-crt',
                          'theme-sunrise', 'theme-daylight', 'theme-sunset', 'theme-midnight');
    
    // Skip theme application on excluded pages
    if (isExcludedPage()) {
      html.style.colorScheme = '';
      return;
    }
    
    // Check if there's an adaptive theme set
    const adaptiveTheme = getAdaptive();
    if (adaptiveTheme && VALID_ADAPTIVE_THEMES.includes(adaptiveTheme)) {
      html.classList.add('theme-' + adaptiveTheme);
      // Set appropriate color scheme based on adaptive theme
      // Light themes: light, high-contrast-light, paper
      // Dark themes: dark, high-contrast-dark, neon, oled, retro-crt
      const lightThemes = ['light', 'high-contrast-light', 'paper'];
      const isDark = !lightThemes.includes(adaptiveTheme);
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
      apply(); 
    }
  });
  
  // Export API
  window.Theme = { get, set, apply, getAdaptive, setAdaptive };
})();
