/**
 * Portal Overlay Menu
 * Provides role-based navigation overlay for Team and Developer users
 * 
 * Dependencies:
 * - auth-config.js (G_CRED_KEY)
 * - auth-utils.js (getCurrentEmail, isTeamMember, isDeveloper)
 * - jwt_decode library
 */

(function() {
  'use strict';

  // Link definitions for different roles
  const TEAM_LINKS = [
    {
      icon: '✅',
      title: 'Tasks',
      description: 'View and manage team tasks',
      url: '/tasks'
    },
    {
      icon: '📅',
      title: 'Calendar',
      description: 'Team events and schedule',
      url: '/calendar'
    },
    {
      icon: '🔗',
      title: 'Links',
      description: 'Internal resources hub',
      url: '/links/index.html'
    },
    {
      icon: '⚙️',
      title: 'Settings',
      description: 'Manage your preferences',
      url: '/settings'
    }
  ];

  const DEVELOPER_LINKS = [
    {
      icon: '✅',
      title: 'Tasks',
      description: 'View and manage team tasks',
      url: '/tasks'
    },
    {
      icon: '📝',
      title: 'Developer Console',
      description: 'Edit site content and manage users',
      url: '/developer'
    },
    {
      icon: '🎨',
      title: 'UI Lab',
      description: 'Experiment with UI components',
      url: '/ui-lab'
    },
    {
      icon: '📊',
      title: 'Telemetry',
      description: 'Site telemetry to GitHub',
      url: '/telemetry'
    },
    {
      icon: '🔗',
      title: 'Links',
      description: 'Internal resources hub',
      url: '/links/index.html'
    },
    {
      icon: '📅',
      title: 'Calendar',
      description: 'Team events and schedule',
      url: '/calendar'
    },
    {
      icon: '⚙️',
      title: 'Settings',
      description: 'Manage your preferences',
      url: '/settings'
    }
  ];

  // Portal state
  let portalOverlay = null;
  let previousFocus = null;
  let isInitialized = false;

  /**
   * Initialize the portal system
   * Creates modal HTML and sets up event listeners
   */
  async function initPortal() {
    if (isInitialized) return;
    isInitialized = true;

    // Preload allowlists to ensure they're cached before any checks
    if (typeof preloadAllowlists === 'function') {
      try {
        await preloadAllowlists();
        console.log('[Portal] Allowlists preloaded successfully');
      } catch (err) {
        console.warn('[Portal] Failed to preload allowlists:', err);
      }
    }

    // Create portal modal HTML
    createPortalModal();

    // Set up event listeners for portal triggers
    setupTriggers();

    // Set up keyboard listeners
    setupKeyboardListeners();

    console.log('[Portal] Initialized successfully');
  }

  /**
   * Create the portal modal HTML structure
   */
  function createPortalModal() {
    const overlay = document.createElement('div');
    overlay.className = 'portal-overlay';
    overlay.id = 'portalOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'portalTitle');

    overlay.innerHTML = `
      <div class="portal-modal" role="document">
        <div class="portal-header">
          <h2 class="portal-title" id="portalTitle">
            <span>Portal</span>
            <span class="portal-role-badge" id="portalRoleBadge"></span>
          </h2>
          <button class="portal-close" id="portalClose" aria-label="Close portal">
            ×
          </button>
        </div>
        <div class="portal-content" id="portalContent">
          <!-- Content will be dynamically inserted here -->
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    portalOverlay = overlay;

    // Set up close button
    const closeBtn = overlay.querySelector('#portalClose');
    closeBtn.addEventListener('click', closePortal);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closePortal();
      }
    });

    // Prevent clicks inside modal from closing
    const modal = overlay.querySelector('.portal-modal');
    modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Set up event listeners for portal trigger buttons
   */
  function setupTriggers() {
    // Find all portal trigger buttons
    const triggers = document.querySelectorAll('[data-portal-trigger]');
    
    triggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        openPortal();
      });
    });

    console.log(`[Portal] Set up ${triggers.length} trigger(s)`);
  }

  /**
   * Set up keyboard event listeners
   */
  function setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      // Close portal on Escape key
      if (e.key === 'Escape' && portalOverlay && portalOverlay.classList.contains('open')) {
        closePortal();
      }
    });
  }

  /**
   * Open the portal modal
   */
  function openPortal() {
    if (!portalOverlay) {
      console.error('[Portal] Portal overlay not initialized');
      return;
    }

    // Store the currently focused element
    previousFocus = document.activeElement;

    // Get current user info
    const email = getCurrentUserEmail();
    const userRole = getUserRole(email);

    // Update portal content based on role
    updatePortalContent(email, userRole);

    // Show the portal
    portalOverlay.classList.add('open');
    document.body.classList.add('portal-open');

    // Focus on close button for accessibility
    setTimeout(() => {
      const closeBtn = portalOverlay.querySelector('#portalClose');
      if (closeBtn) closeBtn.focus();
    }, 100);

    console.log('[Portal] Opened for role:', userRole);
  }

  /**
   * Close the portal modal
   */
  function closePortal() {
    if (!portalOverlay) return;

    portalOverlay.classList.remove('open');
    document.body.classList.remove('portal-open');

    // Restore focus to previous element
    if (previousFocus && typeof previousFocus.focus === 'function') {
      setTimeout(() => {
        previousFocus.focus();
      }, 100);
    }

    console.log('[Portal] Closed');
  }

  /**
   * Get current user's email from authentication
   * @returns {string|null} User email or null if not logged in
   */
  function getCurrentUserEmail() {
    // Use getCurrentEmail from auth-utils.js if available
    if (typeof getCurrentEmail === 'function') {
      return getCurrentEmail();
    }

    // Fallback: try to get from localStorage directly
    if (typeof G_CRED_KEY === 'undefined') {
      console.warn('[Portal] G_CRED_KEY not defined');
      return null;
    }

    const credential = localStorage.getItem(G_CRED_KEY);
    if (!credential) return null;

    try {
      if (typeof jwt_decode !== 'function') {
        console.warn('[Portal] jwt_decode not available');
        return null;
      }

      const decoded = jwt_decode(credential);
      
      // Check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.warn('[Portal] Token expired');
        return null;
      }

      return decoded.email || null;
    } catch (err) {
      console.error('[Portal] Error decoding credential:', err);
      return null;
    }
  }

  /**
   * Determine user's role
   * @param {string|null} email - User email
   * @returns {string} 'developer', 'team', or 'guest'
   */
  function getUserRole(email) {
    if (!email) return 'guest';

    // Check if user is a developer
    if (typeof isDeveloper === 'function' && isDeveloper(email)) {
      return 'developer';
    }

    // Check if user is a team member
    if (typeof isTeamMember === 'function' && isTeamMember(email)) {
      return 'team';
    }

    return 'guest';
  }

  /**
   * Update portal content based on user role
   * @param {string|null} email - User email
   * @param {string} role - User role ('developer', 'team', or 'guest')
   */
  function updatePortalContent(email, role) {
    const roleBadge = document.getElementById('portalRoleBadge');
    const content = document.getElementById('portalContent');

    if (!content) return;

    if (role === 'guest') {
      // Show login prompt for guests
      roleBadge.textContent = '';
      roleBadge.style.display = 'none';
      content.innerHTML = `
        <div class="portal-not-logged-in">
          <div class="portal-not-logged-in-icon">🔒</div>
          <h3>Portal Access Restricted</h3>
          <p>Please sign in with your team account to access the portal and view team resources.</p>
          <a href="#" class="portal-login-prompt" id="portalLoginPrompt">
            Sign In to Continue
          </a>
        </div>
      `;
      
      // Add click handler for login prompt
      const loginPrompt = content.querySelector('#portalLoginPrompt');
      if (loginPrompt) {
        loginPrompt.addEventListener('click', (e) => {
          e.preventDefault();
          const signInButton = document.getElementById('googleSignIn');
          if (signInButton) {
            const googleButton = signInButton.querySelector('div[role=button]');
            if (googleButton) googleButton.click();
          }
          closePortal();
        });
      }
      return;
    }

    // Show role badge
    roleBadge.style.display = 'inline-block';
    
    let links = [];
    let description = '';

    if (role === 'developer') {
      roleBadge.textContent = 'Developer';
      description = 'Access all developer tools, team resources, and management features.';
      links = DEVELOPER_LINKS;
    } else if (role === 'team') {
      roleBadge.textContent = 'Team Member';
      description = 'Access team resources, tasks, and collaboration tools.';
      links = TEAM_LINKS;
    }

    // Generate links HTML
    const linksHTML = links.map(link => `
      <a href="${escapeHtml(link.url)}" class="portal-link">
        <div class="portal-link-icon">${link.icon}</div>
        <div class="portal-link-text">
          <h3 class="portal-link-title">${escapeHtml(link.title)}</h3>
          <p class="portal-link-desc">${escapeHtml(link.description)}</p>
        </div>
      </a>
    `).join('');

    content.innerHTML = `
      <p class="portal-description">${escapeHtml(description)}</p>
      <div class="portal-links">
        ${linksHTML}
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Update portal visibility in navigation based on login status
   * Show/hide portal buttons based on whether user is logged in and authorized
   */
  async function updatePortalVisibility() {
    // Ensure allowlists are loaded before checking roles
    if (typeof preloadAllowlists === 'function') {
      try {
        await preloadAllowlists();
      } catch (err) {
        console.warn('[Portal] Failed to preload allowlists in updatePortalVisibility:', err);
      }
    }
    
    const email = getCurrentUserEmail();
    const role = getUserRole(email);
    
    const portalButtons = document.querySelectorAll('[data-portal-trigger]');
    
    portalButtons.forEach(button => {
      // Only show portal button for team members and developers
      // Guests should not see the portal button at all
      if (role === 'team' || role === 'developer') {
        // Determine display style based on navigation context
        // Mobile nav uses block display, desktop nav uses inline-block
        // Check by ID (explicit) or parent container (fallback)
        const isMobile = button.id === 'portalLinkMobile' || 
                        button.closest('.nav-links-mobile');
        button.style.display = isMobile ? 'block' : 'inline-block';
        console.log('[Portal] Showing portal button for role:', role, 'email:', email);
      } else {
        button.style.display = 'none';
        console.log('[Portal] Hiding portal button for role:', role, 'email:', email);
      }
    });
  }

  // Initialize portal when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await initPortal();
      await updatePortalVisibility();
    });
  } else {
    // DOM already loaded
    (async () => {
      await initPortal();
      await updatePortalVisibility();
    })();
  }

  // Also update visibility when user signs in/out
  window.addEventListener('storage', (e) => {
    // Use typeof check to ensure G_CRED_KEY is defined
    if (typeof G_CRED_KEY !== 'undefined' && (e.key === G_CRED_KEY || e.key === 'signedInEmail')) {
      updatePortalVisibility();
    }
  });

  // Export functions for external use if needed
  if (typeof window !== 'undefined') {
    window.Portal = {
      open: openPortal,
      close: closePortal,
      updateVisibility: updatePortalVisibility
    };
  }

})();
