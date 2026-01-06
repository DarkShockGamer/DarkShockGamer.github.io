/**
 * Accessibility Panel Component
 * Provides a floating panel with accessibility controls
 */

(function() {
  'use strict';

  /**
   * Create and inject the accessibility panel HTML
   */
  function createAccessibilityPanel() {
    const panel = document.createElement('div');
    panel.className = 'accessibility-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Accessibility Controls');
    panel.setAttribute('aria-hidden', 'true');
    
    panel.innerHTML = `
      <h3 style="margin: 0 0 1rem 0; font-size: 1.25rem; font-weight: 600;">Accessibility</h3>
      
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
          Font Size: <span id="fontSize-value">16</span>px
        </label>
        <input 
          type="range" 
          id="fontSize-slider" 
          class="slider" 
          min="12" 
          max="24" 
          value="16"
          aria-label="Adjust font size"
        >
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
          <span style="font-weight: 600;">Reduced Motion</span>
          <div class="toggle" id="reducedMotion-toggle" role="switch" aria-checked="false" tabindex="0">
            <div class="toggle-knob"></div>
          </div>
        </label>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; opacity: 0.8;">
          Minimizes animations and transitions
        </p>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
          <span style="font-weight: 600;">Dyslexia-Friendly Font</span>
          <div class="toggle" id="dyslexiaFont-toggle" role="switch" aria-checked="false" tabindex="0">
            <div class="toggle-knob"></div>
          </div>
        </label>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; opacity: 0.8;">
          Uses easier-to-read font styles
        </p>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
          <span style="font-weight: 600;">Cursor Glow Effect</span>
          <div class="toggle" id="cursorGlow-toggle" role="switch" aria-checked="true" tabindex="0">
            <div class="toggle-knob"></div>
          </div>
        </label>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; opacity: 0.8;">
          Soft glow follows your cursor
        </p>
      </div>
      
      <button 
        id="accessibility-close" 
        style="width: 100%; padding: 0.75rem; background: var(--ui-accent-color); color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: background 0.2s;"
        aria-label="Close accessibility panel"
      >
        Close
      </button>
    `;
    
    return panel;
  }

  /**
   * Create the toggle button
   */
  function createToggleButton() {
    const button = document.createElement('button');
    button.className = 'accessibility-toggle';
    button.setAttribute('aria-label', 'Open accessibility controls');
    button.setAttribute('aria-expanded', 'false');
    button.textContent = 'Accessibility';
    
    return button;
  }

  /**
   * Initialize toggle controls
   */
  function initializeControls() {
    // Font size slider
    const fontSizeSlider = document.getElementById('fontSize-slider');
    const fontSizeValue = document.getElementById('fontSize-value');
    
    if (fontSizeSlider && window.ModernUI) {
      // Set initial value
      const currentSize = window.ModernUI.FontSize.get();
      fontSizeSlider.value = currentSize;
      fontSizeValue.textContent = currentSize;
      
      // Handle changes
      fontSizeSlider.addEventListener('input', (e) => {
        const size = e.target.value;
        fontSizeValue.textContent = size;
        window.ModernUI.FontSize.set(parseInt(size));
      });
    }
    
    // Reduced motion toggle
    const reducedMotionToggle = document.getElementById('reducedMotion-toggle');
    if (reducedMotionToggle && window.ModernUI) {
      // Set initial state
      const isEnabled = window.ModernUI.ReducedMotion.get();
      updateToggleState(reducedMotionToggle, isEnabled);
      
      // Handle clicks
      reducedMotionToggle.addEventListener('click', () => {
        const newState = !reducedMotionToggle.classList.contains('on');
        updateToggleState(reducedMotionToggle, newState);
        window.ModernUI.ReducedMotion.set(newState);
        
        // Refresh scroll reveal
        if (window.ModernUI.ScrollReveal) {
          window.ModernUI.ScrollReveal.refresh();
        }
        
        // Update cursor glow
        if (window.ModernUI.CursorGlow) {
          window.ModernUI.CursorGlow.set(window.ModernUI.CursorGlow.get());
        }
      });
      
      // Handle keyboard activation
      reducedMotionToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          reducedMotionToggle.click();
        }
      });
    }
    
    // Dyslexia font toggle
    const dyslexiaFontToggle = document.getElementById('dyslexiaFont-toggle');
    if (dyslexiaFontToggle && window.ModernUI) {
      // Set initial state
      const isEnabled = window.ModernUI.DyslexiaFont.get();
      updateToggleState(dyslexiaFontToggle, isEnabled);
      
      // Handle clicks
      dyslexiaFontToggle.addEventListener('click', () => {
        const newState = !dyslexiaFontToggle.classList.contains('on');
        updateToggleState(dyslexiaFontToggle, newState);
        window.ModernUI.DyslexiaFont.set(newState);
      });
      
      // Handle keyboard activation
      dyslexiaFontToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dyslexiaFontToggle.click();
        }
      });
    }
    
    // Cursor glow toggle
    const cursorGlowToggle = document.getElementById('cursorGlow-toggle');
    if (cursorGlowToggle && window.ModernUI) {
      // Set initial state
      const isEnabled = window.ModernUI.CursorGlow.get();
      updateToggleState(cursorGlowToggle, isEnabled);
      
      // Handle clicks
      cursorGlowToggle.addEventListener('click', () => {
        const newState = !cursorGlowToggle.classList.contains('on');
        updateToggleState(cursorGlowToggle, newState);
        window.ModernUI.CursorGlow.set(newState);
      });
      
      // Handle keyboard activation
      cursorGlowToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cursorGlowToggle.click();
        }
      });
    }
  }

  /**
   * Update toggle button state
   */
  function updateToggleState(toggle, isOn) {
    if (isOn) {
      toggle.classList.add('on');
      toggle.setAttribute('aria-checked', 'true');
    } else {
      toggle.classList.remove('on');
      toggle.setAttribute('aria-checked', 'false');
    }
  }

  /**
   * Initialize the accessibility panel
   */
  function init() {
    // Don't initialize if already exists
    if (document.querySelector('.accessibility-panel')) {
      return;
    }
    
    // Create and inject panel
    const panel = createAccessibilityPanel();
    document.body.appendChild(panel);
    
    // Create and inject toggle button
    const toggleButton = createToggleButton();
    document.body.appendChild(toggleButton);
    
    // Handle toggle button click
    toggleButton.addEventListener('click', () => {
      const isOpen = panel.classList.contains('open');
      
      if (isOpen) {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        toggleButton.setAttribute('aria-expanded', 'false');
      } else {
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        toggleButton.setAttribute('aria-expanded', 'true');
      }
    });
    
    // Handle close button
    const closeButton = document.getElementById('accessibility-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.focus();
      });
    }
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('open')) {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.focus();
      }
    });
    
    // Initialize controls
    initializeControls();
  }

  // Initialize when DOM is ready and ModernUI is available
  function initWhenReady() {
    if (document.body && window.ModernUI) {
      init();
    } else {
      setTimeout(initWhenReady, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
  } else {
    initWhenReady();
  }

  // Export API
  window.AccessibilityPanel = {
    init
  };
})();
