// assets/js/settings.js
// Logic for loading and saving user settings (full name, email) with localStorage fallback
// Backend-ready: uncomment and adapt fetch() calls when you have a backend API

// Utility: get/set settings from localStorage
function getLocalSettings() {
  return {
    fullname: localStorage.getItem("trident.fullname") || "",
    email: localStorage.getItem("trident.email") || "",
  }
}

function setLocalSettings(settings) {
  if(settings.fullname !== undefined) localStorage.setItem("trident.fullname", settings.fullname);
  if(settings.email !== undefined) localStorage.setItem("trident.email", settings.email);
}

var signedInEmail = localStorage.getItem('signedInEmail') || "darkshockgamer@email.com";
document.getElementById("accountEmail").value = signedInEmail;

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
    // Always prefer signed-in email if available
    settings.email = signedInEmail;
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
      const fullname = nameInput.value;
      const email = emailInput.value;
      await saveSettings({ fullname, email });
      if(window.Toast) Toast("Settings saved.", "success");
    });

    // Reset (reload from storage)
    form.addEventListener('reset', async function(e) {
      e.preventDefault();
      const settings = await loadSettings();
      fillAccountForm(settings);
      if(window.Toast) Toast("Changes canceled.", "info");
    });
  }
});
