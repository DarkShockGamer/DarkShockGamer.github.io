/**
 * Modern UI Enhancements
 * Handles enhanced theming, accent colors, scroll reveal, cursor glow, and accessibility features
 */

(function() {
  'use strict';

  // Storage keys
  const STORAGE_KEYS = {
    FONT_SIZE: 'ui-font-size',
    REDUCED_MOTION: 'ui-reduced-motion',
    DYSLEXIA_FONT: 'ui-dyslexia-font'
  };

  // Default values
  const DEFAULTS = {
    FONT_SIZE: 16,
    REDUCED_MOTION: false,
    DYSLEXIA_FONT: false
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
    FontSize.apply();
    ReducedMotion.apply();
    DyslexiaFont.apply();
    
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
    FontSize,
    ReducedMotion,
    DyslexiaFont,
    ScrollReveal
  };
})();
