/**
 * Modern UI Enhancements
 * Handles enhanced theming, accent colors, scroll reveal, cursor glow, and accessibility features
 */

(function() {
  'use strict';

  // Storage keys
  const STORAGE_KEYS = {
    ACCENT_COLOR: 'ui-accent-color',
    FONT_SIZE: 'ui-font-size',
    REDUCED_MOTION: 'ui-reduced-motion',
    DYSLEXIA_FONT: 'ui-dyslexia-font',
    CURSOR_GLOW: 'ui-cursor-glow'
  };

  // Default values
  const DEFAULTS = {
    ACCENT_COLOR: '#38bdf8',
    FONT_SIZE: 16,
    REDUCED_MOTION: false,
    DYSLEXIA_FONT: false,
    CURSOR_GLOW: true
  };

  /**
   * Accent Color System
   */
  const AccentColor = {
    get: function() {
      try {
        return localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR) || DEFAULTS.ACCENT_COLOR;
      } catch {
        return DEFAULTS.ACCENT_COLOR;
      }
    },

    set: function(color) {
      try {
        localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR, color);
      } catch {}
      this.apply(color);
    },

    apply: function(color = this.get()) {
      const root = document.documentElement;
      root.style.setProperty('--ui-accent-color', color);
      
      // Calculate lighter and darker variants
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      // Darker variant (reduce by 20%)
      const darkR = Math.max(0, Math.floor(r * 0.7));
      const darkG = Math.max(0, Math.floor(g * 0.7));
      const darkB = Math.max(0, Math.floor(b * 0.7));
      const darkColor = `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
      
      // Lighter variant (increase by 20%)
      const lightR = Math.min(255, Math.floor(r + (255 - r) * 0.4));
      const lightG = Math.min(255, Math.floor(g + (255 - g) * 0.4));
      const lightB = Math.min(255, Math.floor(b + (255 - b) * 0.4));
      const lightColor = `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
      
      root.style.setProperty('--ui-accent-color-dark', darkColor);
      root.style.setProperty('--ui-accent-color-light', lightColor);
    }
  };

  /**
   * Font Size System
   */
  const FontSize = {
    get: function() {
      try {
        return parseInt(localStorage.getItem(STORAGE_KEYS.FONT_SIZE)) || DEFAULTS.FONT_SIZE;
      } catch {
        return DEFAULTS.FONT_SIZE;
      }
    },

    set: function(size) {
      size = Math.max(12, Math.min(24, size)); // Clamp between 12-24
      try {
        localStorage.setItem(STORAGE_KEYS.FONT_SIZE, size);
      } catch {}
      this.apply(size);
    },

    apply: function(size = this.get()) {
      document.documentElement.style.setProperty('--ui-base-font-size', `${size}px`);
    }
  };

  /**
   * Reduced Motion System
   */
  const ReducedMotion = {
    get: function() {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION);
        if (stored !== null) {
          return stored === 'true';
        }
      } catch {}
      
      // Check system preference
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    set: function(enabled) {
      try {
        localStorage.setItem(STORAGE_KEYS.REDUCED_MOTION, enabled);
      } catch {}
      this.apply(enabled);
    },

    apply: function(enabled = this.get()) {
      if (enabled) {
        document.documentElement.classList.add('reduced-motion');
      } else {
        document.documentElement.classList.remove('reduced-motion');
      }
    }
  };

  /**
   * Dyslexia Font System
   */
  const DyslexiaFont = {
    get: function() {
      try {
        return localStorage.getItem(STORAGE_KEYS.DYSLEXIA_FONT) === 'true';
      } catch {
        return DEFAULTS.DYSLEXIA_FONT;
      }
    },

    set: function(enabled) {
      try {
        localStorage.setItem(STORAGE_KEYS.DYSLEXIA_FONT, enabled);
      } catch {}
      this.apply(enabled);
    },

    apply: function(enabled = this.get()) {
      if (enabled) {
        document.documentElement.classList.add('dyslexia-font');
      } else {
        document.documentElement.classList.remove('dyslexia-font');
      }
    }
  };

  /**
   * Cursor Glow System
   */
  const CursorGlow = {
    element: null,
    enabled: true,
    lastX: 0,
    lastY: 0,
    rafId: null,

    get: function() {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.CURSOR_GLOW);
        return stored === null ? DEFAULTS.CURSOR_GLOW : stored === 'true';
      } catch {
        return DEFAULTS.CURSOR_GLOW;
      }
    },

    set: function(enabled) {
      try {
        localStorage.setItem(STORAGE_KEYS.CURSOR_GLOW, enabled);
      } catch {}
      this.enabled = enabled;
      if (this.element) {
        if (enabled && !ReducedMotion.get()) {
          this.element.classList.add('active');
        } else {
          this.element.classList.remove('active');
        }
      }
    },

    init: function() {
      // Don't init on touch devices or if reduced motion is preferred
      if (window.matchMedia('(hover: none)').matches || ReducedMotion.get()) {
        return;
      }

      this.enabled = this.get();
      
      // Create cursor glow element
      this.element = document.createElement('div');
      this.element.id = 'cursor-glow';
      document.body.appendChild(this.element);

      // Update position on mouse move (throttled with RAF)
      document.addEventListener('mousemove', (e) => {
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        
        if (!this.rafId) {
          this.rafId = requestAnimationFrame(() => {
            this.updatePosition();
            this.rafId = null;
          });
        }
      });

      // Activate on first move
      document.addEventListener('mousemove', () => {
        if (this.enabled && !ReducedMotion.get()) {
          this.element.classList.add('active');
        }
      }, { once: true });

      // Apply initial state
      if (this.enabled) {
        this.element.classList.add('active');
      }
    },

    updatePosition: function() {
      if (this.element) {
        // Center the glow on cursor
        this.element.style.transform = `translate(${this.lastX - 150}px, ${this.lastY - 150}px)`;
      }
    }
  };

  /**
   * Scroll Reveal System
   */
  const ScrollReveal = {
    observer: null,

    init: function() {
      // Don't init if reduced motion is preferred
      if (ReducedMotion.get()) {
        // Make everything visible immediately
        document.querySelectorAll('.scroll-reveal, .scroll-reveal-stagger').forEach(el => {
          el.classList.add('revealed');
        });
        return;
      }

      // Create intersection observer
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });

      // Observe all scroll reveal elements
      document.querySelectorAll('.scroll-reveal, .scroll-reveal-stagger').forEach(el => {
        this.observer.observe(el);
      });
    },

    refresh: function() {
      if (this.observer) {
        this.observer.disconnect();
      }
      this.init();
    }
  };

  /**
   * Initialize all systems on DOM ready
   */
  function initModernUI() {
    // Apply stored preferences
    AccentColor.apply();
    FontSize.apply();
    ReducedMotion.apply();
    DyslexiaFont.apply();
    
    // Initialize cursor glow
    CursorGlow.init();
    
    // Initialize scroll reveal
    ScrollReveal.init();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModernUI);
  } else {
    initModernUI();
  }

  // Re-initialize scroll reveal when new content is added
  const contentObserver = new MutationObserver(() => {
    ScrollReveal.refresh();
  });

  if (document.body) {
    contentObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Export API
  window.ModernUI = {
    AccentColor,
    FontSize,
    ReducedMotion,
    DyslexiaFont,
    CursorGlow,
    ScrollReveal
  };
})();
