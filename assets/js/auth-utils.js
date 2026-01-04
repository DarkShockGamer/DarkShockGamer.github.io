/**
 * Shared authentication and role utilities
 * Provides centralized functions for user role checks, developer management,
 * and welcome overlay handling across the site.
 */

// Storage keys (G_CRED_KEY is defined in auth-config.js)
const DEVELOPER_LIST_KEY = 'developer_emails';
const WELCOME_SHOWN_KEY = 'welcome_shown_';

// Hardcoded developer emails (always allowed)
const HARDCODED_DEVELOPERS = [
  'blackshocktrooper@gmail.com',
  'palm4215@wths.net'
];

/**
 * Get the current user's email from localStorage credential
 * @returns {string|null} - Normalized email or null if not signed in
 */
function getCurrentEmail() {
  const credential = localStorage.getItem(G_CRED_KEY);
  if (!credential) return null;
  
  try {
    // Check if jwt_decode is available
    if (typeof jwt_decode !== 'function') {
      console.warn('[Auth Utils] jwt_decode not available yet');
      return null;
    }
    
    const decoded = jwt_decode(credential);
    const email = decoded.email;
    
    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.warn('[Auth Utils] Token expired');
      localStorage.removeItem(G_CRED_KEY);
      localStorage.removeItem('signedInEmail');
      return null;
    }
    
    return email ? normalizeEmail(email) : null;
  } catch (err) {
    console.error('[Auth Utils] Error decoding credential:', err);
    return null;
  }
}

/**
 * Normalize email address (trim and lowercase)
 * @param {string} email - Email address to normalize
 * @returns {string} - Normalized email
 */
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

/**
 * Check if email is a team member (has access to tasks)
 * Team members: any @wths.net email OR blackshocktrooper@gmail.com
 * @param {string} email - Email address to check
 * @returns {boolean} - True if team member
 */
function isTeamMember(email) {
  if (!email) return false;
  
  const normalized = normalizeEmail(email);
  
  // Check if AUTH_CONFIG is available for centralized authorization
  if (window.AUTH_CONFIG && typeof AUTH_CONFIG.isAuthorized === 'function') {
    return AUTH_CONFIG.isAuthorized(normalized);
  }
  
  // Fallback: check domain and specific emails
  const allowedDomains = ['wths.net'];
  const allowedEmails = ['blackshocktrooper@gmail.com'];
  
  const domainAllowed = allowedDomains.some(domain => 
    normalized.endsWith('@' + domain.toLowerCase())
  );
  
  const emailAllowed = allowedEmails.some(allowed => 
    normalized === normalizeEmail(allowed)
  );
  
  return domainAllowed || emailAllowed;
}

/**
 * Get list of developer emails from localStorage
 * @returns {Array<string>} - Array of developer emails (normalized)
 */
function getDeveloperList() {
  try {
    const stored = localStorage.getItem(DEVELOPER_LIST_KEY);
    if (!stored) return [];
    const list = JSON.parse(stored);
    return Array.isArray(list) ? list.map(normalizeEmail) : [];
  } catch (err) {
    console.error('[Auth Utils] Error reading developer list:', err);
    return [];
  }
}

/**
 * Save developer list to localStorage
 * @param {Array<string>} list - Array of developer emails
 */
function saveDeveloperList(list) {
  try {
    const normalized = list.map(normalizeEmail);
    localStorage.setItem(DEVELOPER_LIST_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.error('[Auth Utils] Error saving developer list:', err);
  }
}

/**
 * Check if email is a developer (has access to developer pages)
 * Developers: hardcoded emails OR emails in localStorage
 * @param {string} email - Email address to check
 * @returns {boolean} - True if developer
 */
function isDeveloper(email) {
  if (!email) return false;
  
  const normalized = normalizeEmail(email);
  
  // Check hardcoded developers
  const isHardcoded = HARDCODED_DEVELOPERS.some(dev => 
    normalizeEmail(dev) === normalized
  );
  
  if (isHardcoded) return true;
  
  // Check localStorage developers
  const devList = getDeveloperList();
  return devList.includes(normalized);
}

/**
 * Add a developer email to the list
 * @param {string} email - Email address to add
 * @returns {boolean} - True if added successfully, false if duplicate or invalid
 */
function addDeveloper(email) {
  if (!email) return false;
  
  const normalized = normalizeEmail(email);
  
  // Basic email validation
  if (!normalized.includes('@') || !normalized.includes('.')) {
    return false;
  }
  
  const devList = getDeveloperList();
  
  // Check if already in list or hardcoded
  if (devList.includes(normalized) || 
      HARDCODED_DEVELOPERS.some(dev => normalizeEmail(dev) === normalized)) {
    return false; // Duplicate
  }
  
  devList.push(normalized);
  saveDeveloperList(devList);
  return true;
}

/**
 * Remove a developer email from the list
 * @param {string} email - Email address to remove
 * @returns {boolean} - True if removed successfully, false if not found or hardcoded
 */
function removeDeveloper(email) {
  if (!email) return false;
  
  const normalized = normalizeEmail(email);
  
  // Cannot remove hardcoded developers
  if (HARDCODED_DEVELOPERS.some(dev => normalizeEmail(dev) === normalized)) {
    return false;
  }
  
  const devList = getDeveloperList();
  const index = devList.indexOf(normalized);
  
  if (index === -1) {
    return false; // Not found
  }
  
  devList.splice(index, 1);
  saveDeveloperList(devList);
  return true;
}

/**
 * Get all developer emails (hardcoded + localStorage)
 * @returns {Array<string>} - Array of all developer emails
 */
function getAllDevelopers() {
  const hardcoded = HARDCODED_DEVELOPERS.map(normalizeEmail);
  const stored = getDeveloperList();
  
  // Combine and deduplicate
  const all = [...hardcoded, ...stored];
  return [...new Set(all)];
}

/**
 * Check if a developer email is hardcoded (cannot be removed)
 * @param {string} email - Email address to check
 * @returns {boolean} - True if hardcoded
 */
function isHardcodedDeveloper(email) {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return HARDCODED_DEVELOPERS.some(dev => normalizeEmail(dev) === normalized);
}

/**
 * Check if welcome overlay has been shown for current user
 * @param {string} email - User email
 * @returns {boolean} - True if already shown
 */
function hasWelcomeBeenShown(email) {
  if (!email) return true; // Don't show if no email
  const normalized = normalizeEmail(email);
  const key = WELCOME_SHOWN_KEY + normalized;
  return localStorage.getItem(key) === 'true';
}

/**
 * Mark welcome overlay as shown for current user
 * @param {string} email - User email
 */
function markWelcomeAsShown(email) {
  if (!email) return;
  const normalized = normalizeEmail(email);
  const key = WELCOME_SHOWN_KEY + normalized;
  localStorage.setItem(key, 'true');
}

/**
 * Show welcome overlay for the current user
 * @param {string} email - User email
 * @param {string} role - 'developer' or 'team'
 */
function showWelcomeOverlay(email, role) {
  // Check if already shown
  if (hasWelcomeBeenShown(email)) {
    return;
  }
  
  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'welcomeOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-in-out;
  `;
  
  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: linear-gradient(135deg, #0a1f44, #1f4d7a);
    color: #f4f8fb;
    padding: 2.5rem;
    border-radius: 20px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    border: 2px solid #4fa3d1;
    position: relative;
    animation: slideIn 0.4s ease-out;
  `;
  
  let content = '';
  
  if (role === 'developer') {
    content = `
      <div style="text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🛠️</div>
        <h2 style="font-size: 1.8rem; margin-bottom: 1rem; color: #ffd700;">Welcome, Developer!</h2>
        <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem; opacity: 0.95;">
          You have full developer access to the Trident Robotics site. You can manage site content, 
          monitor telemetry, experiment with UI components, and access all team features.
        </p>
        <div style="background: rgba(10, 31, 68, 0.6); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid #4fa3d1;">
          <h3 style="font-size: 1.2rem; margin-bottom: 1rem; color: #4fa3d1;">Quick Links:</h3>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <a href="/developer" style="color: #ffd700; text-decoration: none; font-weight: bold;">📝 Developer Console</a>
            <a href="/ui-lab" style="color: #ffd700; text-decoration: none; font-weight: bold;">🎨 UI Lab</a>
            <a href="/telemetry" style="color: #ffd700; text-decoration: none; font-weight: bold;">📊 Telemetry</a>
            <a href="/tasks" style="color: #ffd700; text-decoration: none; font-weight: bold;">✅ Tasks</a>
          </div>
        </div>
      </div>
    `;
  } else if (role === 'team') {
    content = `
      <div style="text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">👋</div>
        <h2 style="font-size: 1.8rem; margin-bottom: 1rem; color: #ffd700;">Welcome, Team Member!</h2>
        <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem; opacity: 0.95;">
          You now have access to the team task board. Stay organized, track progress, 
          and collaborate with your fellow Trident Robotics members.
        </p>
        <div style="background: rgba(10, 31, 68, 0.6); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid #4fa3d1;">
          <a href="/tasks" style="display: inline-block; background: #ffd700; color: #0a1f44; padding: 0.75rem 1.5rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; transition: all 0.3s;">
            Go to Task Board →
          </a>
        </div>
      </div>
    `;
  }
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: transparent;
    border: none;
    color: #f4f8fb;
    font-size: 2rem;
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.3s;
  `;
  closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
  closeBtn.onmouseout = () => closeBtn.style.background = 'transparent';
  closeBtn.onclick = () => overlay.remove();
  
  // Don't show again checkbox
  const checkboxContainer = document.createElement('div');
  checkboxContainer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1.5rem;
    gap: 0.5rem;
  `;
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'dontShowAgain';
  checkbox.style.cssText = `
    width: 18px;
    height: 18px;
    cursor: pointer;
  `;
  
  const label = document.createElement('label');
  label.htmlFor = 'dontShowAgain';
  label.textContent = "Don't show this again";
  label.style.cssText = `
    cursor: pointer;
    font-size: 0.95rem;
    opacity: 0.9;
  `;
  
  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(label);
  
  modal.innerHTML = content;
  modal.appendChild(closeBtn);
  modal.appendChild(checkboxContainer);
  
  overlay.appendChild(modal);
  
  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateY(-50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  // Close on clicking overlay background
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      if (checkbox.checked) {
        markWelcomeAsShown(email);
      }
      overlay.remove();
    }
  };
  
  // Close button handler
  closeBtn.onclick = () => {
    if (checkbox.checked) {
      markWelcomeAsShown(email);
    }
    overlay.remove();
  };
  
  // Add to document
  document.body.appendChild(overlay);
}

/**
 * Initialize welcome overlay if needed (call after user signs in)
 * @param {string} email - User email (optional, will get from storage if not provided)
 */
function initWelcomeOverlay(email) {
  const userEmail = email || getCurrentEmail();
  if (!userEmail) return;
  
  // Check if already shown
  if (hasWelcomeBeenShown(userEmail)) {
    return;
  }
  
  // Determine role and show appropriate overlay
  if (isDeveloper(userEmail)) {
    showWelcomeOverlay(userEmail, 'developer');
  } else if (isTeamMember(userEmail)) {
    showWelcomeOverlay(userEmail, 'team');
  }
  // If neither developer nor team member, don't show anything
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCurrentEmail,
    normalizeEmail,
    isTeamMember,
    isDeveloper,
    getDeveloperList,
    addDeveloper,
    removeDeveloper,
    getAllDevelopers,
    isHardcodedDeveloper,
    hasWelcomeBeenShown,
    markWelcomeAsShown,
    showWelcomeOverlay,
    initWelcomeOverlay
  };
}
