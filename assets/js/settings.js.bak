// assets/js/settings.js
// Logic for loading and saving user settings (full name, email) with localStorage fallback
// Backend-ready: uncomment and adapt fetch() calls when you have a backend API

// ==================== SETTINGS KEYS ====================
const SETTINGS_KEYS = {
  // Account
  FULLNAME: "trident.fullname",
  EMAIL: "signedInEmail",
  // Notifications
  NOTIFICATIONS_ENABLED: "trident.notifications.enabled",
  NOTIFICATION_SOUND: "trident.notifications.sound",
  // Appearance
  THEME: "trident.appearance.theme",
  REDUCE_MOTION: "trident.appearance.reduceMotion",
  // Privacy
  DATA_COLLECTION: "trident.privacy.dataCollection",
  // Google login
  GOOGLE_CREDENTIAL: "google.credential"
};

// ==================== UTILITY FUNCTIONS ====================

// Utility: get/set settings from localStorage
function getLocalSettings() {
  const lsEmail = localStorage.getItem(SETTINGS_KEYS.EMAIL) || "";
  const runtimeEmail = (typeof window !== 'undefined' && window.signedInEmail) ? window.signedInEmail : "";
  
  return {
    fullname: localStorage.getItem(SETTINGS_KEYS.FULLNAME) || "",
    email: lsEmail || runtimeEmail,
  }
}

function setLocalSettings(settings) {
  if(settings.fullname !== undefined) localStorage.setItem(SETTINGS_KEYS.FULLNAME, settings.fullname);
  // Email is readonly - managed by Google login, so we don't save it here
}

// Load settings from backend or localStorage
async function loadSettings() {
  try {
    // --- Uncomment for backend API integration ---
    /*
    const resp = await fetch('/api/user/settings', { credentials: 'include' });
    if(resp.ok) {
      const data = await resp.json();
      return { fullname: data.fullname, email: data.email };
    }
    */
    // Fallback to localStorage:
    const settings = getLocalSettings();
    return settings;
  } catch (e) {
    // Fallback to localStorage on error
    return getLocalSettings();
  }
}

// Save settings to backend or localStorage
async function saveSettings(settings) {
  setLocalSettings(settings); // Always save as backup
  // --- Uncomment for backend API integration ---
  /*
  await fetch('/api/user/settings', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify(settings)
  });
  */
  // Play success sound
  if(window.Sound) window.Sound.success();
}

// Populate form fields from settings
function fillAccountForm(settings) {
  document.getElementById("accountEmail").value = settings.email || "";
  document.getElementById("accountName").value = settings.fullname || "";
}

// ==================== NOTIFICATIONS MANAGEMENT ====================

const NotificationSettings = {
  // Initialize notification settings
  init() {
    const enabled = localStorage.getItem(SETTINGS_KEYS.NOTIFICATIONS_ENABLED);
    const sound = localStorage.getItem(SETTINGS_KEYS.NOTIFICATION_SOUND) || "Chime";
    
    // Set initial state
    if (enabled === null) {
      localStorage.setItem(SETTINGS_KEYS.NOTIFICATIONS_ENABLED, "true");
    }
    
    return {
      enabled: enabled !== "false",
      sound: sound
    };
  },

  // Request browser notification permission
  async requestPermission() {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  },

  // Send a test notification
  async sendTestNotification(sound) {
    if (Notification.permission === "granted") {
      const notification = new Notification("Trident Robotics", {
        body: "Calendar notifications are now enabled!",
        icon: "/assets/logo.png",
        tag: "test-notification"
      });

      // Play sound if enabled
      if (sound && sound !== "Off") {
        this.playNotificationSound(sound);
      }

      // Auto-close after 4 seconds
      setTimeout(() => notification.close(), 4000);
    }
  },

  // Simulate a calendar event notification
  async sendCalendarNotification(eventTitle, eventTime, sound) {
    if (Notification.permission === "granted") {
      const notification = new Notification("Calendar Reminder", {
        body: `${eventTitle} at ${eventTime}`,
        icon: "/assets/logo.png",
        tag: "calendar-event"
      });

      // Play sound if enabled
      if (sound && sound !== "Off") {
        this.playNotificationSound(sound);
      }

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  },

  // Play notification sound based on user selection
  playNotificationSound(soundType) {
    if (!window.Sound || soundType === "Off") return;

    switch(soundType) {
      case "Chime":
        window.Sound.success();
        break;
      case "Ping":
        window.Sound.info();
        break;
      case "Pop":
        window.Sound.click();
        break;
      default:
        window.Sound.info();
    }
  },

  // Save notification settings
  save(enabled, sound) {
    localStorage.setItem(SETTINGS_KEYS.NOTIFICATIONS_ENABLED, enabled.toString());
    localStorage.setItem(SETTINGS_KEYS.NOTIFICATION_SOUND, sound);
  }
};

// ==================== APPEARANCE MANAGEMENT ====================

const AppearanceSettings = {
  // Initialize appearance settings
  init() {
    const theme = localStorage.getItem(SETTINGS_KEYS.THEME) || "System";
    const reduceMotion = localStorage.getItem(SETTINGS_KEYS.REDUCE_MOTION) === "true";
    
    this.applyTheme(theme);
    this.applyReduceMotion(reduceMotion);
    
    return { theme, reduceMotion };
  },

  // Apply theme to the site
  applyTheme(theme) {
    const html = document.documentElement;
    const body = document.body;

    // Remove existing theme classes
    html.classList.remove("theme-light", "theme-dark", "theme-high-contrast");
    body.classList.remove("theme-light", "theme-dark", "theme-high-contrast");

    switch(theme) {
      case "Light":
        html.classList.add("theme-light");
        body.classList.add("theme-light");
        html.style.colorScheme = "light";
        break;
      case "Dark":
        html.classList.add("theme-dark");
        body.classList.add("theme-dark");
        html.style.colorScheme = "dark";
        break;
      case "High Contrast":
        html.classList.add("theme-high-contrast");
        body.classList.add("theme-high-contrast");
        html.style.colorScheme = "dark";
        break;
      case "System":
      default:
        // Let system preference take over
        html.style.colorScheme = "";
        break;
    }
  },

  // Apply reduce motion setting
  applyReduceMotion(enabled) {
    const html = document.documentElement;
    
    if (enabled) {
      html.classList.add("reduce-motion");
      // Add style rule to disable animations
      if (!document.getElementById("reduce-motion-style")) {
        const style = document.createElement("style");
        style.id = "reduce-motion-style";
        style.textContent = `
          .reduce-motion *,
          .reduce-motion *::before,
          .reduce-motion *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      html.classList.remove("reduce-motion");
      const style = document.getElementById("reduce-motion-style");
      if (style) style.remove();
    }
  },

  // Save appearance settings
  save(theme, reduceMotion) {
    localStorage.setItem(SETTINGS_KEYS.THEME, theme);
    localStorage.setItem(SETTINGS_KEYS.REDUCE_MOTION, reduceMotion.toString());
    
    this.applyTheme(theme);
    this.applyReduceMotion(reduceMotion);
  }
};

// ==================== PRIVACY & SECURITY MANAGEMENT ====================

const PrivacySettings = {
  // Initialize privacy settings
  init() {
    const dataCollection = localStorage.getItem(SETTINGS_KEYS.DATA_COLLECTION);
    
    // Default to true if not set
    if (dataCollection === null) {
      localStorage.setItem(SETTINGS_KEYS.DATA_COLLECTION, "true");
      return { dataCollection: true };
    }
    
    return { dataCollection: dataCollection === "true" };
  },

  // Clear all user data
  clearUserData() {
    // Clear Google login data
    localStorage.removeItem(SETTINGS_KEYS.GOOGLE_CREDENTIAL);
    localStorage.removeItem(SETTINGS_KEYS.EMAIL);
    
    // Clear user account data
    localStorage.removeItem(SETTINGS_KEYS.FULLNAME);
    
    // Clear window.signedInEmail if it exists
    if (window.signedInEmail) {
      window.signedInEmail = null;
    }
    
    console.log("User data cleared");
  },

  // Save privacy settings
  save(dataCollection) {
    const wasEnabled = localStorage.getItem(SETTINGS_KEYS.DATA_COLLECTION) === "true";
    
    localStorage.setItem(SETTINGS_KEYS.DATA_COLLECTION, dataCollection.toString());
    
    // If turning off data collection, clear all user data immediately
    if (wasEnabled && !dataCollection) {
      this.clearUserData();
      
      // Show confirmation message
      if (window.Toast) {
        Toast("Data collection disabled. All user data has been cleared.", "info");
      }
    }
  },

  // Check if data collection is allowed
  isAllowed() {
    return localStorage.getItem(SETTINGS_KEYS.DATA_COLLECTION) === "true";
  }
};

// ==================== MAIN DOM INITIALIZATION ====================

// Main logic for settings page
document.addEventListener("DOMContentLoaded", async function() {
  // Initialize all settings modules
  const notificationSettings = NotificationSettings.init();
  const appearanceSettings = AppearanceSettings.init();
  const privacySettings = PrivacySettings.init();

  // ========== ACCOUNT TAB ==========
  const emailInput = document.getElementById("accountEmail");
  const nameInput = document.getElementById("accountName");
  const accountForm = document.getElementById("tabPanel1");
  
  if(emailInput && nameInput && accountForm) {
    // Load settings and fill form
    const settings = await loadSettings();
    fillAccountForm(settings);

    // Save on submit
    accountForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const fullname = nameInput.value.trim();
      // Email is readonly, we don't save it
      await saveSettings({ fullname });
      if(window.Toast) Toast("Settings saved.", "success");
    });

    // Reset (reload from storage)
    accountForm.addEventListener('reset', async function(e) {
      e.preventDefault();
      const settings = await loadSettings();
      fillAccountForm(settings);
      if(window.Sound) window.Sound.click();
      if(window.Toast) Toast("Changes canceled.", "info");
    });
  }

  // ========== NOTIFICATIONS TAB ==========
  const notificationForm = document.getElementById("tabPanel2");
  const notificationToggle = document.getElementById("toggleReminders");
  const notificationLabel = document.getElementById("labelReminders");
  const soundSelect = notificationForm?.querySelector("select");

  if (notificationForm && soundSelect) {
    // Set initial values
    soundSelect.value = notificationSettings.sound;
    
    // Get reference to the toggle setup
    let notificationsEnabled = notificationSettings.enabled;
    
    // Override the toggle behavior to handle notification permissions
    const originalToggleHandler = notificationToggle?._clickHandler;
    if (notificationToggle) {
      // Store current state
      notificationToggle._enabled = notificationsEnabled;
      
      // Add new click handler
      notificationToggle.addEventListener('click', async function(e) {
        e.stopPropagation();
        
        const newState = !notificationToggle._enabled;
        
        if (newState) {
          // Requesting to enable - need permission
          const hasPermission = await NotificationSettings.requestPermission();
          if (hasPermission) {
            notificationToggle._enabled = true;
            notificationToggle.classList.add('on');
            notificationToggle.setAttribute('aria-checked', 'true');
            if (notificationLabel) notificationLabel.textContent = "On";
            
            // Send a test notification
            await NotificationSettings.sendTestNotification(soundSelect.value);
          } else {
            // Permission denied
            if (window.Toast) {
              Toast("Notification permission denied. Please enable in browser settings.", "error");
            }
          }
        } else {
          // Disabling notifications
          notificationToggle._enabled = false;
          notificationToggle.classList.remove('on');
          notificationToggle.setAttribute('aria-checked', 'false');
          if (notificationLabel) notificationLabel.textContent = "Off";
        }
      }, { capture: true });
    }

    // Save form handler
    notificationForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const enabled = notificationToggle?._enabled || false;
      const sound = soundSelect.value;
      
      NotificationSettings.save(enabled, sound);
      
      if(window.Sound) window.Sound.click();
      if(window.Toast) Toast("Notification settings saved.", "success");
    });

    // Reset handler
    notificationForm.addEventListener('reset', function(e) {
      e.preventDefault();
      const settings = NotificationSettings.init();
      soundSelect.value = settings.sound;
      notificationToggle._enabled = settings.enabled;
      notificationToggle.classList.toggle('on', settings.enabled);
      notificationToggle.setAttribute('aria-checked', settings.enabled.toString());
      if (notificationLabel) notificationLabel.textContent = settings.enabled ? "On" : "Off";
      
      if(window.Sound) window.Sound.click();
      if(window.Toast) Toast("Notification settings reset.", "info");
    });
  }

  // ========== APPEARANCE TAB ==========
  const appearanceForm = document.getElementById("tabPanel3");
  const themeSelect = appearanceForm?.querySelector("select");
  const reduceMotionToggle = document.getElementById("toggleReduceMotion");
  const reduceMotionLabel = document.getElementById("labelReduceMotion");

  if (appearanceForm && themeSelect) {
    // Set initial values
    themeSelect.value = appearanceSettings.theme;
    
    // Store reduce motion state and update UI
    if (reduceMotionToggle) {
      reduceMotionToggle._enabled = appearanceSettings.reduceMotion;
      reduceMotionToggle.classList.toggle('on', appearanceSettings.reduceMotion);
      reduceMotionToggle.setAttribute('aria-checked', appearanceSettings.reduceMotion.toString());
      if (reduceMotionLabel) reduceMotionLabel.textContent = appearanceSettings.reduceMotion ? "On" : "Off";
      
      // Update toggle to use stored state
      reduceMotionToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        const newState = !reduceMotionToggle._enabled;
        reduceMotionToggle._enabled = newState;
        reduceMotionToggle.classList.toggle('on', newState);
        reduceMotionToggle.setAttribute('aria-checked', newState.toString());
        if (reduceMotionLabel) reduceMotionLabel.textContent = newState ? "On" : "Off";
      }, { capture: true });
    }

    // Save form handler
    appearanceForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const theme = themeSelect.value;
      const reduceMotion = reduceMotionToggle?._enabled || false;
      
      AppearanceSettings.save(theme, reduceMotion);
      
      if(window.Sound) window.Sound.click();
      if(window.Toast) Toast("Appearance settings saved.", "success");
    });

    // Reset handler
    appearanceForm.addEventListener('reset', function(e) {
      e.preventDefault();
      const settings = AppearanceSettings.init();
      themeSelect.value = settings.theme;
      if (reduceMotionToggle) {
        reduceMotionToggle._enabled = settings.reduceMotion;
        reduceMotionToggle.classList.toggle('on', settings.reduceMotion);
        reduceMotionToggle.setAttribute('aria-checked', settings.reduceMotion.toString());
        if (reduceMotionLabel) reduceMotionLabel.textContent = settings.reduceMotion ? "On" : "Off";
      }
      
      if(window.Sound) window.Sound.click();
      if(window.Toast) Toast("Appearance settings reset.", "info");
    });
  }

  // ========== PRIVACY & SECURITY TAB ==========
  const privacyForm = document.getElementById("tabPanel4");
  const dataCollectionToggle = document.getElementById("toggleDataCollection");
  const dataCollectionLabel = document.getElementById("labelDataCollection");

  if (privacyForm && dataCollectionToggle) {
    // Store data collection state and update UI
    dataCollectionToggle._enabled = privacySettings.dataCollection;
    dataCollectionToggle.classList.toggle('on', privacySettings.dataCollection);
    dataCollectionToggle.setAttribute('aria-checked', privacySettings.dataCollection.toString());
    if (dataCollectionLabel) dataCollectionLabel.textContent = privacySettings.dataCollection ? "On" : "Off";
    
    // Update toggle to use stored state
    dataCollectionToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      const newState = !dataCollectionToggle._enabled;
      
      // If turning off, show confirmation
      if (!newState) {
        const confirmed = confirm(
          "Disabling data collection will immediately clear all stored user information including your Google login. Continue?"
        );
        if (!confirmed) {
          return; // User cancelled
        }
      }
      
      dataCollectionToggle._enabled = newState;
      dataCollectionToggle.classList.toggle('on', newState);
      dataCollectionToggle.setAttribute('aria-checked', newState.toString());
      if (dataCollectionLabel) dataCollectionLabel.textContent = newState ? "On" : "Off";
    }, { capture: true });

    // Save form handler
    privacyForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const dataCollection = dataCollectionToggle?._enabled !== false;
      
      PrivacySettings.save(dataCollection);
      
      if(window.Sound) window.Sound.click();
      if(window.Toast) Toast("Privacy settings saved.", "success");
    });

    // Reset handler
    privacyForm.addEventListener('reset', function(e) {
      e.preventDefault();
      const settings = PrivacySettings.init();
      dataCollectionToggle._enabled = settings.dataCollection;
      dataCollectionToggle.classList.toggle('on', settings.dataCollection);
      dataCollectionToggle.setAttribute('aria-checked', settings.dataCollection.toString());
      if (dataCollectionLabel) dataCollectionLabel.textContent = settings.dataCollection ? "On" : "Off";
      
      if(window.Sound) window.Sound.click();
      if(window.Toast) Toast("Privacy settings reset.", "info");
    });
  }
});
