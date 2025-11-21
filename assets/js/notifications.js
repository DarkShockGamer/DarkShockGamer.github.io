// assets/js/notifications.js
// Notification system for tasks and calendar events
// Displays toast notifications for due soon, overdue, event soon, and event started
(function() {
  'use strict';

  // ==================== CONFIGURATION ====================
  const CONFIG = {
    DUE_SOON_MINUTES: 60,
    SCAN_INTERVAL_MS: 60000, // 60 seconds
    MEMORY_KEY: 'trident.notif.memory'
  };

  // ==================== STATE ====================
  let scanTimer = null;
  let isInitialized = false;

  // ==================== UTILITY FUNCTIONS ====================

  // Settings keys - should match settings.js
  const SETTINGS_KEYS = {
    NOTIFICATIONS_ENABLED: 'trident.notifications.enabled',
    NOTIFICATION_SOUND: 'trident.notifications.sound'
  };

  /**
   * Get notification settings from localStorage
   * @returns {Object} Settings object with enabled and sound properties
   */
  function getNotificationSettings() {
    const enabled = localStorage.getItem(SETTINGS_KEYS.NOTIFICATIONS_ENABLED);
    const sound = localStorage.getItem(SETTINGS_KEYS.NOTIFICATION_SOUND) || 'Chime';
    
    return {
      enabled: enabled !== 'false', // Default to true if not set
      sound: sound
    };
  }

  /**
   * Check if notifications are enabled and permission granted
   * @returns {boolean} True if notifications should be shown
   */
  function shouldShowNotifications() {
    const settings = getNotificationSettings();
    if (!settings.enabled) return false;
    
    // We only use in-page toasts, so always return true if enabled
    return true;
  }

  /**
   * Get notification memory from localStorage
   * @returns {Object} Memory object
   */
  function getMemory() {
    try {
      const stored = localStorage.getItem(CONFIG.MEMORY_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn('Failed to load notification memory:', e);
      return {};
    }
  }

  /**
   * Save notification memory to localStorage
   * @param {Object} memory - Memory object to save
   */
  function saveMemory(memory) {
    try {
      localStorage.setItem(CONFIG.MEMORY_KEY, JSON.stringify(memory));
    } catch (e) {
      console.warn('Failed to save notification memory:', e);
    }
  }

  /**
   * Check if notification has been shown for a specific item and type
   * @param {string} itemId - Item ID
   * @param {string} notifType - Notification type (e.g., 'due-soon', 'overdue', 'event-soon', 'event-started')
   * @returns {boolean} True if notification was already shown
   */
  function hasShown(itemId, notifType) {
    const memory = getMemory();
    const key = `${itemId}:${notifType}`;
    return memory[key] === true;
  }

  /**
   * Mark notification as shown
   * @param {string} itemId - Item ID
   * @param {string} notifType - Notification type
   */
  function markShown(itemId, notifType) {
    const memory = getMemory();
    const key = `${itemId}:${notifType}`;
    memory[key] = true;
    saveMemory(memory);
  }

  /**
   * Parse date string to Date object, treating date-only as end of day
   * @param {string} dateStr - Date string (YYYY-MM-DD or ISO format)
   * @returns {Date|null} Date object or null if invalid
   */
  function parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Check if it's date-only format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // Treat as end of day (23:59:59)
        return new Date(dateStr + 'T23:59:59');
      }
      
      // Otherwise parse as-is (should handle ISO format)
      return new Date(dateStr);
    } catch (e) {
      console.warn('Failed to parse date:', dateStr, e);
      return null;
    }
  }

  /**
   * Get minutes until a date
   * @param {Date} date - Target date
   * @returns {number} Minutes until date (negative if past)
   */
  function getMinutesUntil(date) {
    if (!date || isNaN(date.getTime())) return Infinity;
    const now = new Date();
    const diffMs = date - now;
    return diffMs / (1000 * 60);
  }

  // ==================== TASK NOTIFICATIONS ====================

  /**
   * Scan tasks for notifications
   * @param {Array} tasks - Array of task objects
   */
  function scanTasks(tasks) {
    if (!tasks || !Array.isArray(tasks)) return;
    
    const now = new Date();
    
    tasks.forEach(task => {
      // Skip deleted, archived, or done tasks
      if (task.deleted || task.archived || task.column === 'done') return;
      
      // Skip tasks without due dates
      if (!task.due) return;
      
      const dueDate = parseDate(task.due);
      if (!dueDate) return;
      
      const minutesUntil = getMinutesUntil(dueDate);
      
      // Check for overdue
      if (minutesUntil < 0) {
        if (!hasShown(task.id, 'overdue')) {
          showTaskOverdueNotification(task);
          markShown(task.id, 'overdue');
        }
      }
      // Check for due soon (within threshold)
      else if (minutesUntil <= CONFIG.DUE_SOON_MINUTES) {
        if (!hasShown(task.id, 'due-soon')) {
          showTaskDueSoonNotification(task, minutesUntil);
          markShown(task.id, 'due-soon');
        }
      }
    });
  }

  /**
   * Show task due soon notification
   * @param {Object} task - Task object
   * @param {number} minutesUntil - Minutes until due
   */
  function showTaskDueSoonNotification(task, minutesUntil) {
    const timeStr = minutesUntil < 60 
      ? `${Math.round(minutesUntil)} minutes`
      : `${Math.round(minutesUntil / 60)} hours`;
    
    if (window.Toast && window.Toast.create) {
      Toast.create({
        type: 'info',
        message: `Task "${task.title}" is due in ${timeStr}`,
        ttl: 10000,
        sound: 'default'
      });
    }
  }

  /**
   * Show task overdue notification
   * @param {Object} task - Task object
   */
  function showTaskOverdueNotification(task) {
    if (window.Toast && window.Toast.create) {
      Toast.create({
        type: 'warn',
        message: `Task "${task.title}" is overdue!`,
        ttl: 12000,
        sound: 'default'
      });
    }
  }

  // ==================== EVENT NOTIFICATIONS ====================

  /**
   * Scan events for notifications
   * @param {Array} events - Array of event objects
   */
  function scanEvents(events) {
    if (!events || !Array.isArray(events)) return;
    
    const now = new Date();
    
    events.forEach(event => {
      // Skip private events if they don't belong to current user
      // Use createdBy as the canonical field (matches Firestore data)
      if (event.private && event.createdBy !== getCurrentUserEmail()) {
        return;
      }
      
      // Parse event date and time
      const eventDate = parseEventDateTime(event);
      if (!eventDate) return;
      
      const minutesUntil = getMinutesUntil(eventDate);
      
      // Check if event has started (is happening now or recently started)
      if (minutesUntil < 0 && minutesUntil > -5) {
        // Just started (within last 5 minutes)
        if (!hasShown(event.id, 'event-started')) {
          showEventStartedNotification(event);
          markShown(event.id, 'event-started');
        }
      }
      // Check for event soon (within threshold)
      else if (minutesUntil > 0 && minutesUntil <= CONFIG.DUE_SOON_MINUTES) {
        if (!hasShown(event.id, 'event-soon')) {
          showEventSoonNotification(event, minutesUntil);
          markShown(event.id, 'event-soon');
        }
      }
    });
  }

  /**
   * Parse event date and time
   * @param {Object} event - Event object
   * @returns {Date|null} Date object or null
   */
  function parseEventDateTime(event) {
    if (!event.date) return null;
    
    try {
      // If event has startTime, combine date and time
      if (event.startTime) {
        const dateTimeStr = `${event.date}T${event.startTime}`;
        return new Date(dateTimeStr);
      }
      
      // Otherwise use date only (start of day)
      return new Date(event.date + 'T00:00:00');
    } catch (e) {
      console.warn('Failed to parse event date/time:', event, e);
      return null;
    }
  }

  /**
   * Show event soon notification
   * @param {Object} event - Event object
   * @param {number} minutesUntil - Minutes until event
   */
  function showEventSoonNotification(event, minutesUntil) {
    const timeStr = minutesUntil < 60 
      ? `${Math.round(minutesUntil)} minutes`
      : `${Math.round(minutesUntil / 60)} hours`;
    
    if (window.Toast && window.Toast.create) {
      Toast.create({
        type: 'success',
        message: `Event "${event.title}" starts in ${timeStr}`,
        ttl: 10000,
        sound: 'default'
      });
    }
  }

  /**
   * Show event started notification
   * @param {Object} event - Event object
   */
  function showEventStartedNotification(event) {
    if (window.Toast && window.Toast.create) {
      Toast.create({
        type: 'info',
        message: `Event "${event.title}" has started!`,
        ttl: 10000,
        sound: 'default'
      });
    }
  }

  /**
   * Get current user email
   * @returns {string} User email or empty string
   */
  function getCurrentUserEmail() {
    return localStorage.getItem('signedInEmail') || '';
  }

  // ==================== SCANNING LOGIC ====================

  /**
   * Perform a single scan of tasks and events
   * 
   * This function scans window.currentTasks and window.currentEvents which should
   * be populated by the page's existing data loading logic.
   */
  function scanOnce() {
    if (!shouldShowNotifications()) {
      return;
    }
    
    // Scan tasks from window.currentTasks if available
    if (window.currentTasks && Array.isArray(window.currentTasks)) {
      scanTasks(window.currentTasks);
    }
    
    // Scan events from window.currentEvents if available
    if (window.currentEvents && Array.isArray(window.currentEvents)) {
      scanEvents(window.currentEvents);
    }
  }

  /**
   * Load tasks from Firestore
   * @returns {Promise<Array>} Array of task objects
   * 
   * Note: This is a fallback. The preferred method is to use window.currentTasks
   * which is populated by the page's existing data loading logic.
   */
  async function loadTasksFromFirestore() {
    // This function is intentionally minimal as pages should expose window.currentTasks
    // Firestore access would require importing Firebase modules which are already
    // loaded by the page scripts. This fallback does nothing to avoid security
    // concerns with dynamic imports and duplicate Firebase instances.
    return [];
  }

  /**
   * Load events from Firestore
   * @returns {Promise<Array>} Array of event objects
   * 
   * Note: This is a fallback. The preferred method is to use window.currentEvents
   * which is populated by the page's existing data loading logic.
   */
  async function loadEventsFromFirestore() {
    // This function is intentionally minimal as pages should expose window.currentEvents
    // Firestore access would require importing Firebase modules which are already
    // loaded by the page scripts. This fallback does nothing to avoid security
    // concerns with dynamic imports and duplicate Firebase instances.
    return [];
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize notification system
   * Starts periodic scanning every 60 seconds
   */
  function initNotifications() {
    if (isInitialized) {
      console.debug('Notifications already initialized');
      return;
    }
    
    isInitialized = true;
    
    // Run first scan immediately
    scanOnce();
    
    // Set up periodic scanning
    if (scanTimer) clearInterval(scanTimer);
    scanTimer = setInterval(() => {
      scanOnce();
    }, CONFIG.SCAN_INTERVAL_MS);
    
    console.debug('Notification system initialized');
  }

  /**
   * Stop notification system
   */
  function stopNotifications() {
    if (scanTimer) {
      clearInterval(scanTimer);
      scanTimer = null;
    }
    isInitialized = false;
    console.debug('Notification system stopped');
  }

  /**
   * Set due soon threshold in minutes
   * @param {number} minutes - Minutes threshold
   */
  function setDueSoonMinutes(minutes) {
    if (typeof minutes === 'number' && minutes > 0) {
      CONFIG.DUE_SOON_MINUTES = minutes;
      console.debug('Due soon threshold set to', minutes, 'minutes');
    }
  }

  // ==================== PUBLIC API ====================

  window.Notifications = {
    initNotifications,
    scanOnce,
    stopNotifications,
    setDueSoonMinutes,
    getNotificationSettings
  };

  // Note: settings.js also exposes window.getNotificationSettings
  // This provides a fallback if settings.js is not loaded

})();
