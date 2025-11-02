/**
 * Custom Context Menu Component
 * 
 * A reusable context menu that replaces the default browser context menu
 * on both desktop (right-click) and mobile (long-press).
 * 
 * Features:
 * - Context-aware menu items (different options for images, text, links, etc.)
 * - Mobile long-press support with haptic feedback
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Accessible with ARIA attributes
 * - Easy to extend with custom menu items
 * 
 * Usage:
 *   // Include the CSS and JS files in your HTML
 *   <link rel="stylesheet" href="/assets/css/context-menu.css">
 *   <script src="/assets/js/context-menu.js"></script>
 *   
 *   // Initialize the context menu (automatic on DOMContentLoaded)
 *   // Or manually: ContextMenu.init();
 *   
 *   // Customize menu items globally:
 *   ContextMenu.config.imageMenuItems = [
 *     { label: 'Custom Action', action: (target) => console.log(target) }
 *   ];
 */

(function(window, document) {
  'use strict';

  // Context Menu Configuration
  const config = {
    // Long press duration for mobile (ms)
    longPressDuration: 500,
    
    // Prevent default context menu
    preventDefaultContextMenu: true,
    
    // Menu items for images
    imageMenuItems: [
      {
        label: 'Open Image in New Tab',
        icon: '🖼️',
        action: (target) => {
          const src = target.src || target.dataset.src;
          if (src) window.open(src, '_blank');
        }
      },
      {
        label: 'Copy Image Address',
        icon: '📋',
        action: (target) => {
          const src = target.src || target.dataset.src;
          if (src) {
            navigator.clipboard.writeText(src).then(() => {
              showToast('Image address copied!');
            }).catch(err => console.error('Failed to copy:', err));
          }
        }
      },
      {
        label: 'Download Image',
        icon: '⬇️',
        action: (target) => {
          const src = target.src || target.dataset.src;
          if (src) {
            const link = document.createElement('a');
            link.href = src;
            link.download = src.split('/').pop() || 'image';
            link.click();
          }
        }
      }
    ],
    
    // Menu items for links
    linkMenuItems: [
      {
        label: 'Open Link in New Tab',
        icon: '🔗',
        action: (target) => {
          const href = target.href || target.dataset.href;
          if (href) window.open(href, '_blank');
        }
      },
      {
        label: 'Copy Link Address',
        icon: '📋',
        action: (target) => {
          const href = target.href || target.dataset.href;
          if (href) {
            navigator.clipboard.writeText(href).then(() => {
              showToast('Link copied!');
            }).catch(err => console.error('Failed to copy:', err));
          }
        }
      }
    ],
    
    // Menu items for text selection
    textMenuItems: [
      {
        label: 'Copy',
        icon: '📋',
        action: () => {
          const selection = window.getSelection().toString().trim();
          if (selection) {
            // Use modern Clipboard API with fallback
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(selection).then(() => {
                showToast('Text copied!');
              }).catch(err => {
                // Fallback to deprecated method if modern API fails
                document.execCommand('copy');
                showToast('Text copied!');
              });
            } else {
              // Fallback for older browsers
              document.execCommand('copy');
              showToast('Text copied!');
            }
          }
        }
      },
      {
        label: 'Search Selection',
        icon: '🔍',
        action: () => {
          const selection = window.getSelection().toString().trim();
          if (selection) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(selection)}`, '_blank');
          }
        }
      }
    ],
    
    // Default menu items for other elements
    defaultMenuItems: [
      {
        label: 'Refresh Page',
        icon: '🔄',
        action: () => {
          location.reload();
        }
      },
      {
        label: 'Back',
        icon: '⬅️',
        action: () => {
          window.history.back();
        }
      }
    ]
  };

  // Context Menu State
  let menuElement = null;
  let currentTarget = null;
  let longPressTimer = null;
  let touchStartPos = { x: 0, y: 0 };
  let selectedItemIndex = -1;

  /**
   * Initialize the context menu
   */
  function init() {
    createMenuElement();
    attachEventListeners();
  }

  /**
   * Create the menu DOM element
   */
  function createMenuElement() {
    menuElement = document.createElement('div');
    menuElement.id = 'custom-context-menu';
    menuElement.className = 'custom-context-menu';
    menuElement.setAttribute('role', 'menu');
    menuElement.setAttribute('aria-hidden', 'true');
    menuElement.style.display = 'none';
    document.body.appendChild(menuElement);
  }

  /**
   * Attach event listeners for context menu
   */
  function attachEventListeners() {
    // Desktop: right-click
    document.addEventListener('contextmenu', handleContextMenu, false);
    
    // Mobile: long-press
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, false);
    
    // Close menu on click outside or scroll
    document.addEventListener('click', closeMenu, false);
    document.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu, false);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyDown, false);
    
    // Prevent text selection during long press
    document.addEventListener('selectstart', preventSelectionDuringLongPress, false);
  }

  /**
   * Handle desktop context menu (right-click)
   */
  function handleContextMenu(e) {
    if (!config.preventDefaultContextMenu) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    currentTarget = e.target;
    showMenu(e.clientX, e.clientY);
  }

  /**
   * Handle touch start for long-press detection
   */
  function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartPos = { x: touch.clientX, y: touch.clientY };
    currentTarget = e.target;
    
    // Clear any existing timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    
    // Start long-press timer
    longPressTimer = setTimeout(() => {
      // Vibrate if supported (haptic feedback)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      showMenu(touchStartPos.x, touchStartPos.y);
      longPressTimer = null;
    }, config.longPressDuration);
  }

  /**
   * Handle touch move - cancel long press if finger moves too much
   */
  function handleTouchMove(e) {
    if (!longPressTimer) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    
    // Cancel long press if moved more than 10px
    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  /**
   * Handle touch end - cancel long press
   */
  function handleTouchEnd(e) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  /**
   * Prevent text selection during long press
   */
  function preventSelectionDuringLongPress(e) {
    if (longPressTimer) {
      e.preventDefault();
    }
  }

  /**
   * Show the context menu at specified coordinates
   */
  function showMenu(x, y) {
    const menuItems = getContextMenuItems();
    
    if (menuItems.length === 0) {
      return;
    }
    
    // Build menu HTML
    menuElement.innerHTML = menuItems.map((item, index) => `
      <div class="context-menu-item" 
           role="menuitem" 
           tabindex="${index === 0 ? '0' : '-1'}"
           data-index="${index}">
        <span class="context-menu-icon">${item.icon || ''}</span>
        <span class="context-menu-label">${item.label}</span>
      </div>
    `).join('');
    
    // Attach click handlers to menu items
    const itemElements = menuElement.querySelectorAll('.context-menu-item');
    itemElements.forEach((el, index) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        executeMenuAction(menuItems[index]);
        closeMenu();
      });
    });
    
    // Position the menu
    positionMenu(x, y);
    
    // Show the menu
    menuElement.style.display = 'block';
    menuElement.setAttribute('aria-hidden', 'false');
    
    // Focus first item
    selectedItemIndex = 0;
    if (itemElements[0]) {
      itemElements[0].focus();
    }
  }

  /**
   * Position the menu to avoid viewport overflow
   */
  function positionMenu(x, y) {
    const menuWidth = 250; // From CSS
    const menuHeight = menuElement.offsetHeight || 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = x;
    let top = y;
    
    // Adjust horizontal position
    if (x + menuWidth > viewportWidth) {
      left = viewportWidth - menuWidth - 10;
    }
    
    // Adjust vertical position
    if (y + menuHeight > viewportHeight) {
      top = viewportHeight - menuHeight - 10;
    }
    
    menuElement.style.left = `${Math.max(10, left)}px`;
    menuElement.style.top = `${Math.max(10, top)}px`;
  }

  /**
   * Get appropriate menu items based on the target element
   */
  function getContextMenuItems() {
    if (!currentTarget) return config.defaultMenuItems;
    
    // Check if target is an image
    if (currentTarget.tagName === 'IMG' || (currentTarget.dataset && currentTarget.dataset.contextType === 'image')) {
      return config.imageMenuItems;
    }
    
    // Check if target is a link
    if (currentTarget.tagName === 'A' || (currentTarget.closest && currentTarget.closest('a'))) {
      const linkElement = currentTarget.tagName === 'A' ? currentTarget : (currentTarget.closest ? currentTarget.closest('a') : null);
      if (linkElement) {
        currentTarget = linkElement;
        return config.linkMenuItems;
      }
    }
    
    // Check if there's text selection
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return config.textMenuItems;
    }
    
    // Default menu items
    return config.defaultMenuItems;
  }

  /**
   * Execute a menu item action
   */
  function executeMenuAction(menuItem) {
    if (menuItem && typeof menuItem.action === 'function') {
      try {
        menuItem.action(currentTarget);
      } catch (err) {
        console.error('Context menu action error:', err);
      }
    }
  }

  /**
   * Close the context menu
   */
  function closeMenu(e) {
    // Don't close if clicking inside the menu
    if (e && e.target && menuElement && menuElement.contains(e.target)) {
      return;
    }
    
    if (menuElement) {
      menuElement.style.display = 'none';
      menuElement.setAttribute('aria-hidden', 'true');
      menuElement.innerHTML = '';
    }
    
    currentTarget = null;
    selectedItemIndex = -1;
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeyDown(e) {
    // Only handle keys when menu is open
    if (menuElement.style.display === 'none') return;
    
    const items = menuElement.querySelectorAll('.context-menu-item');
    if (items.length === 0) return;
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        selectedItemIndex = (selectedItemIndex + 1) % items.length;
        items[selectedItemIndex].focus();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        selectedItemIndex = (selectedItemIndex - 1 + items.length) % items.length;
        items[selectedItemIndex].focus();
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (selectedItemIndex >= 0 && items[selectedItemIndex]) {
          items[selectedItemIndex].click();
        }
        break;
    }
  }

  /**
   * Show a toast notification to provide user feedback
   * @param {string} message - The message to display in the toast
   * @param {number} [duration=2000] - How long to show the toast in milliseconds
   */
  function showToast(message, duration = 2000) {
    // Remove any existing toast
    const existingToast = document.querySelector('.context-menu-toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'context-menu-toast';
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide and remove toast
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API
  window.ContextMenu = {
    init,
    config,
    showToast,
    close: closeMenu
  };

})(window, document);
