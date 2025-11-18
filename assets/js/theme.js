/**
 * Theme Manager for DarkShockGamer.github.io
 * 
 * Manages persistent site theme across settings.html, tasks.html, and calendar.html
 * Supports: system, light, dark, and high-contrast themes
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'site-theme';
  const VALID_THEMES = ['system', 'light', 'dark', 'high-contrast'];
  const HTML_CLASSES = {
    'light': 'theme-light',
    'dark': 'theme-dark',
    'high-contrast': 'theme-high-contrast'
  };

  /**
   * Get the current theme preference from localStorage
   * @returns {string} The theme preference ('system', 'light', 'dark', 'high-contrast')
   */
  function getTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_THEMES.includes(stored) ? stored : 'system';
  }

  /**
   * Set the theme preference and apply it
   * @param {string} theme - The theme to set ('system', 'light', 'dark', 'high-contrast')
   */
  function setTheme(theme) {
    if (!VALID_THEMES.includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Using 'system' instead.`);
      theme = 'system';
    }
    
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme();
  }

  /**
   * Apply the current theme to the HTML element
   */
  function applyTheme() {
    const theme = getTheme();
    const html = document.documentElement;
    
    // Remove all theme classes first
    Object.values(HTML_CLASSES).forEach(className => {
      html.classList.remove(className);
    });
    
    // For 'system', don't add any class - let @media (prefers-color-scheme) handle it
    if (theme === 'system') {
      return;
    }
    
    // For specific themes, add the corresponding class
    const className = HTML_CLASSES[theme];
    if (className) {
      html.classList.add(className);
    }
  }

  /**
   * Listen for system color scheme changes when in 'system' mode
   */
  function watchSystemTheme() {
    if (!window.matchMedia) return;
    
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      // Only react if we're in system mode
      if (getTheme() === 'system') {
        applyTheme();
      }
    };
    
    // Modern browsers
    if (darkModeQuery.addEventListener) {
      darkModeQuery.addEventListener('change', handleChange);
    } else if (darkModeQuery.addListener) {
      // Legacy browsers
      darkModeQuery.addListener(handleChange);
    }
  }

  /**
   * Sync theme changes across tabs via storage events
   */
  function syncAcrossTabs() {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        applyTheme();
      }
    });
  }

  /**
   * Initialize the theme system
   */
  function init() {
    applyTheme();
    watchSystemTheme();
    syncAcrossTabs();
  }

  // Public API
  window.Theme = {
    get: getTheme,
    set: setTheme,
    apply: applyTheme
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
