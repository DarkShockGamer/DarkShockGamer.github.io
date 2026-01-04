/**
 * Developer-specific authentication guard for protected pages
 * 
 * This module restricts access to developer-only pages.
 * Only these emails can access:
 *   - blackshocktrooper@gmail.com (hardcoded)
 *   - palm4215@wths.net (hardcoded)
 *   - Any emails added via the developer management interface (stored in localStorage)
 * 
 * Usage:
 *   Include auth-config.js, auth-utils.js, and this script in the <head> of developer pages:
 *   <script src="/assets/js/auth-config.js"></script>
 *   <script src="/assets/js/auth-utils.js"></script>
 *   <script src="/assets/js/auth-guard-developer.js"></script>
 */

(function() {
  'use strict';

  // Storage key for Google credential (matches auth-config.js)
  const G_CRED_KEY = 'g_credential_v1';

  /**
   * Main access control check
   * Called repeatedly until all dependencies are loaded
   */
  function checkDeveloperAccess() {
    // Check if user is signed in
    const credential = localStorage.getItem(G_CRED_KEY);
    
    if (!credential) {
      // Not signed in - redirect to home with return URL
      redirectToHome();
      return;
    }
    
    // Check if jwt_decode is loaded
    if (typeof jwt_decode !== 'function') {
      // jwt_decode not loaded yet, wait
      setTimeout(checkDeveloperAccess, 50);
      return;
    }

    // Check if auth-utils is loaded
    if (typeof isDeveloper !== 'function') {
      // auth-utils not loaded yet, wait
      setTimeout(checkDeveloperAccess, 50);
      return;
    }
    
    // User is signed in and dependencies are loaded - check authorization
    try {
      const decoded = jwt_decode(credential);
      const email = decoded.email;
      
      // Check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        // Token expired - clear storage and redirect to home
        console.warn('[Developer Auth Guard] Token expired');
        localStorage.removeItem(G_CRED_KEY);
        localStorage.removeItem('signedInEmail');
        redirectToHome();
        return;
      }
      
      if (!email) {
        // No email in token - redirect to restricted page
        console.warn('[Developer Auth Guard] No email in token');
        redirectToRestricted();
        return;
      }
      
      // Check if user is a developer
      if (!isDeveloper(email)) {
        // User is signed in but not a developer
        console.warn('[Developer Auth Guard] User is not a developer:', email);
        redirectToRestricted();
        return;
      }
      
      // User is authorized - allow page to load
      console.log('[Developer Auth Guard] Developer access granted for:', email);
      
    } catch (err) {
      // Error decoding credential - clear storage and redirect to home
      console.error('[Developer Auth Guard] Error decoding credential:', err);
      localStorage.removeItem(G_CRED_KEY);
      localStorage.removeItem('signedInEmail');
      redirectToHome();
    }
  }

  /**
   * Redirect to home page with return URL
   */
  function redirectToHome() {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = '/?return=' + returnUrl;
  }

  /**
   * Redirect to restricted page
   * Note: /restricted.html exists at the site root
   */
  function redirectToRestricted() {
    window.location.href = '/restricted.html';
  }

  // Start the access check when script loads
  checkDeveloperAccess();

})();
