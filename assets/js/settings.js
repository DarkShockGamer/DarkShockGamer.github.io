// assets/js/settings.js
// Logic for loading and saving user settings (full name, email) with localStorage fallback
// Backend-ready: uncomment and adapt fetch() calls when you have a backend API

// Utility: get/set settings from localStorage
function getLocalSettings() {
  return {
    fullname: localStorage.getItem("trident.fullname") || "",
    email: localStorage.getItem("signedInEmail") || "",
  }
}

function setLocalSettings(settings) {
  if(settings.fullname !== undefined) localStorage.setItem("trident.fullname", settings.fullname);
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

// Main logic for settings page
document.addEventListener("DOMContentLoaded", async function() {
  // If the fields exist (we're on settings.html), wire up persistence
  const emailInput = document.getElementById("accountEmail");
  const nameInput = document.getElementById("accountName");
  const form = document.getElementById("tabPanel1");
  if(emailInput && nameInput && form) {
    // Load settings and fill form
    const settings = await loadSettings();
    fillAccountForm(settings);

    // Save on submit
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const fullname = nameInput.value.trim();
      // Email is readonly, we don't save it
      await saveSettings({ fullname });
      if(window.Toast) Toast("Settings saved.", "success");
    });

    // Reset (reload from storage)
    form.addEventListener('reset', async function(e) {
      e.preventDefault();
      const settings = await loadSettings();
      fillAccountForm(settings);
      if(window.Sound) window.Sound.toggle();
      if(window.Toast) Toast("Changes canceled.", "info");
    });
  }
});
