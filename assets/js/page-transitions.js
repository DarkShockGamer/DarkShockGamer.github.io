/**
 * Page Transitions using View Transitions API
 * Handles smooth page transitions for internal navigation
 */

(function() {
  'use strict';

  // Check if View Transitions API is supported
  const supportsViewTransitions = 'startViewTransition' in document;

  /**
   * Check if a link should be intercepted for page transitions
   */
  function shouldInterceptLink(anchor) {
    // Don't intercept if:
    // - Not an anchor element
    if (!anchor || anchor.tagName !== 'A') return false;
    
    // - Has download attribute
    if (anchor.hasAttribute('download')) return false;
    
    // - Has target attribute (opens in new window/tab)
    if (anchor.hasAttribute('target')) return false;
    
    // - Is a hash link (same page navigation)
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return false;
    
    // - Is an external link
    if (anchor.hostname && anchor.hostname !== window.location.hostname) return false;
    
    // - Is a mailto, tel, or other protocol link
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.includes('://') && !href.startsWith(window.location.origin)) return false;
    
    return true;
  }

  /**
   * Navigate to a URL with a page transition
   */
  function navigateWithTransition(url) {
    // Check if reduced motion is preferred
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasReducedMotionClass = document.documentElement.classList.contains('reduced-motion');
    
    if (supportsViewTransitions && !prefersReducedMotion && !hasReducedMotionClass) {
      // Use View Transitions API
      document.startViewTransition(() => {
        window.location.href = url;
      });
    } else {
      // Fallback: simple navigation
      window.location.href = url;
    }
  }

  /**
   * Initialize page transitions
   */
  function initPageTransitions() {
    // Intercept click events on links
    document.addEventListener('click', (e) => {
      // Find the anchor element (could be clicking on child element)
      let target = e.target;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }
      
      if (!target) return;
      
      // Check if we should intercept this link
      if (!shouldInterceptLink(target)) return;
      
      // Check for modifier keys (Ctrl, Cmd, Shift for browser behaviors)
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      
      // Prevent default and navigate with transition
      e.preventDefault();
      const href = target.getAttribute('href');
      navigateWithTransition(href);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageTransitions);
  } else {
    initPageTransitions();
  }

  // Export API
  window.PageTransitions = {
    navigate: navigateWithTransition,
    supported: supportsViewTransitions
  };
})();
