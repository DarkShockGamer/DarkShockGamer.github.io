/**
 * Shared authentication and authorization guard for protected pages
 * 
 * This module provides a client-side access control mechanism to prevent
 * accidental access to protected pages. It is NOT a substitute for server-side security.
 * 
 * Usage:
 *   Include auth-config.js and this script in the <head> of protected pages:
 *   <script src="/assets/js/auth-config.js"></script>
 *   <script src="/assets/js/auth-guard.js"></script>
 * 
 * Configuration:
 *   Team member access is now managed via /assets/data/team-members.json.
 *   Edit /assets/js/auth-config.js to configure override emails (allowedEmails array).
 */

(function() {
  'use strict';

  // Storage key for Google credential (matches auth-config.js)
  const G_CRED_KEY = 'g_credential_v1';

  /**
   * Check if user is authorized based on their email
   * Delegates to AUTH_CONFIG.isAuthorized() for actual authorization check
   */
  function isUserAuthorized(email) {
    if (!email) return false;
    
    // Wait for AUTH_CONFIG to be available
    if (!window.AUTH_CONFIG) {
      return false;
    }

    // Use the centralized authorization logic
    return window.AUTH_CONFIG.isAuthorized(email);
  }

  /**
   * Main access control check
   * Called repeatedly until all dependencies are loaded
   */
  function checkAccess() {
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
      setTimeout(checkAccess, 50);
      return;
    }

    // Check if AUTH_CONFIG is loaded
    if (!window.AUTH_CONFIG) {
      // AUTH_CONFIG not loaded yet, wait
      setTimeout(checkAccess, 50);
      return;
    }
    
    // User is signed in and dependencies are loaded - check authorization
    try {
      const decoded = jwt_decode(credential);
      const email = decoded.email;
      
      // Check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        // Token expired - clear storage and redirect to home
        console.warn('[Auth Guard] Token expired');
        localStorage.removeItem(G_CRED_KEY);
        localStorage.removeItem('signedInEmail');
        redirectToHome();
        return;
      }
      
      if (!email) {
        // No email in token - redirect to restricted page
        console.warn('[Auth Guard] No email in token');
        redirectToRestricted();
        return;
      }
      
      // Check authorization
      if (!isUserAuthorized(email)) {
        // User is signed in but not authorized
        console.warn('[Auth Guard] User not authorized:', email);
        redirectToRestricted();
        return;
      }
      
      // User is authorized - allow page to load
      console.log('[Auth Guard] Access granted for:', email);
      
    } catch (err) {
      // Error decoding credential - clear storage and redirect to home
      console.error('[Auth Guard] Error decoding credential:', err);
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
   */
  function redirectToRestricted() {
    window.location.href = '/restricted.html';
  }

  // Start the access check when script loads
  checkAccess();

})();
