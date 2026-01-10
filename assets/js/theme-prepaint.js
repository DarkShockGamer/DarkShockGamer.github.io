/**
 * Pre-paint theme application to prevent FOUC (Flash of Unstyled Content)
 * This script runs before the page is painted to ensure the correct theme is applied immediately.
 * It must be included in the <head> of themed pages before CSS loads.
 * 
 * Exclusions: index.html and sponsors/index.html should NOT include this script.
 */
(function() {
  // Migration map for old adaptive themes
  const migrationMap = {
    'sunrise': 'light',
    'daylight': 'light',
    'sunset': 'dark',
    'midnight': 'dark'
  };
  
  // Valid adaptive themes - all 8 themes supported
  const validAdaptiveThemes = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark', 'neon', 'oled', 'paper', 'retro-crt'];
  
  // Check if current page should be excluded from theming
  function isExcludedPage() {
    const path = window.location.pathname;
    // Exclude index.html and sponsors/index.html from theming
    return path === '/' || path === '/index.html' || 
           path === '/sponsors' || path === '/sponsors/' || path === '/sponsors/index.html';
  }
  
  // Skip theme application on excluded pages
  if (isExcludedPage()) {
    return;
  }
  
  // Check for adaptive theme first
  let adaptiveTheme = localStorage.getItem('site-adaptive-theme');
  
  // Migrate old theme if found
  if (adaptiveTheme && migrationMap[adaptiveTheme]) {
    adaptiveTheme = migrationMap[adaptiveTheme];
    localStorage.setItem('site-adaptive-theme', adaptiveTheme);
  }
  
  // Remove all existing theme classes to prevent conflicts
  const html = document.documentElement;
  html.classList.remove('theme-light', 'theme-dark', 'theme-high-contrast',
                        'theme-high-contrast-light', 'theme-high-contrast-dark',
                        'theme-neon', 'theme-oled', 'theme-paper', 'theme-retro-crt',
                        'theme-sunrise', 'theme-daylight', 'theme-sunset', 'theme-midnight');
  
  // Also remove Tailwind dark class
  html.classList.remove('dark');
  
  // Apply theme if valid, otherwise default to light
  if (adaptiveTheme && validAdaptiveThemes.includes(adaptiveTheme)) {
    html.classList.add('theme-' + adaptiveTheme);
    // Apply Tailwind dark class for dark themes
    const lightThemes = ['light', 'high-contrast-light', 'paper'];
    if (!lightThemes.includes(adaptiveTheme)) {
      html.classList.add('dark');
    }
  } else {
    // If no valid adaptive theme, default to light
    adaptiveTheme = 'light';
    localStorage.setItem('site-adaptive-theme', adaptiveTheme);
    html.classList.add('theme-light');
  }
})();
