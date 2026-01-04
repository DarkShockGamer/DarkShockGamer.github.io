/**
 * Centralized authentication and authorization configuration
 * Used across the site for consistent access control
 */

// Storage key for Google credential
const G_CRED_KEY = 'g_credential_v1';

// Authorization rules
const AUTH_CONFIG = {
  // Email domains that are allowed access
  allowedDomains: ['wths.net'],
  
  // Specific email addresses that are allowed access
  allowedEmails: ['blackshocktrooper@gmail.com'],
  
  /**
   * Check if an email is authorized
   * @param {string} email - The email address to check
   * @returns {boolean} - True if authorized, false otherwise
   */
  isAuthorized(email) {
    if (!email) return false;
    
    // Normalize email: trim whitespace and convert to lowercase
    const normalizedEmail = (email || '').trim().toLowerCase();
    
    // Check domain-based authorization
    const domainAllowed = this.allowedDomains.some(domain => 
      normalizedEmail.endsWith('@' + domain.toLowerCase())
    );
    
    // Check specific email authorization
    const emailAllowed = this.allowedEmails.some(allowed => 
      normalizedEmail === (allowed || '').trim().toLowerCase()
    );
    
    return domainAllowed || emailAllowed;
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { G_CRED_KEY, AUTH_CONFIG };
}
