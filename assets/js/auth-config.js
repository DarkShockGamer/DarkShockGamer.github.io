/**
 * Centralized authentication and authorization configuration
 * Used across the site for consistent access control
 */

// Storage key for Google credential
const G_CRED_KEY = 'g_credential_v1';

// Authorization rules
const AUTH_CONFIG = {
  // Specific email addresses that are allowed access (legacy override)
  // Note: Team member access is now primarily controlled by assets/data/team-members.json
  // This config serves as an override for special cases
  allowedEmails: ['blackshocktrooper@gmail.com'],
  
  /**
   * Check if an email is authorized (legacy override)
   * Note: This function now serves as an override mechanism only.
   * Primary team member authorization is handled via the allowlist in
   * assets/data/team-members.json and the isTeamMember() function in auth-utils.js
   * @param {string} email - The email address to check
   * @returns {boolean} - True if authorized, false otherwise
   */
  isAuthorized(email) {
    if (!email) return false;
    
    // Normalize email: trim whitespace and convert to lowercase
    const normalizedEmail = (email || '').trim().toLowerCase();
    
    // Check specific email authorization (override mechanism)
    const emailAllowed = this.allowedEmails.some(allowed => 
      normalizedEmail === (allowed || '').trim().toLowerCase()
    );
    
    return emailAllowed;
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { G_CRED_KEY, AUTH_CONFIG };
}
