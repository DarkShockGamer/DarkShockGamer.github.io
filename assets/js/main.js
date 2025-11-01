document.addEventListener('DOMContentLoaded', function() {
  const navLinks = document.getElementById('navLinks');
  const navLinksMobile = document.getElementById('navLinksMobile');
  const navToggle = document.querySelector('.nav-toggle');

  // Attempt to extract signed in email from Google credential in localStorage
  try {
    const G_CRED_KEY = "google.credential"; // <-- Check if your key matches this!
    const raw = localStorage.getItem(G_CRED_KEY);
    if (raw && typeof jwt_decode === "function") {
      const data = jwt_decode(raw);
      if (data && data.email) {
        window.signedInEmail = data.email;
      }
    }
  } catch (e) {
    // fail silently
  }

  // Hide email text in Google signed-in UI to prevent nav overlap
  try {
    const hideEmailStyle = document.createElement('style');
    hideEmailStyle.textContent = '#googleEmail{display:none !important;}';
    document.head.appendChild(hideEmailStyle);
  } catch(e) { /* ignore */ }

  // ======= Primary click sound helper (uses your sound engine) =======
  function sfxClick() {
    try {
      // Prefer global SFX.click if available, fall back to Sound.click or a custom function if you have it
      if (window.SFX && typeof window.SFX.click === 'function') {
        window.SFX.click();
      } else if (window.Sound && typeof window.Sound.click === 'function') {
        window.Sound.click();
      } else if (typeof window.playPrimaryClick === 'function') {
        window.playPrimaryClick();
      }
    } catch (e) {
      // Do nothing on error to avoid disrupting navigation
    }
  }

  // ======= Navigation visibility =======
  function updateNavVisibility() {
    if (window.innerWidth <= 768) {
      navLinks.style.display = 'none';
      navToggle.style.display = 'flex';
      // Only show mobile menu if it has "show"
      navLinksMobile.style.display = navLinksMobile.classList.contains('show') ? 'flex' : 'none';
    } else {
      navLinks.style.display = 'flex';
      navLinksMobile.style.display = 'none';
      navToggle.style.display = 'none';
      navLinks.classList.remove('show');
      navLinksMobile.classList.remove('show');
    }
  }

  updateNavVisibility();
  window.addEventListener('resize', updateNavVisibility);

  // ======= Utility to bind sound to elements =======
  function bindClickSound(el) {
    if (!el) return;
    // Immediate feedback on pointer down (covers mouse/touch/pen)
    el.addEventListener('pointerdown', sfxClick, { passive: true });
    // Keyboard activation
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') sfxClick();
    }, { passive: true });
    // Fallback on click
    el.addEventListener('click', sfxClick, { passive: true });
  }

  // ======= Mobile menu toggle =======
  if (navToggle) {
    bindClickSound(navToggle);
    navToggle.addEventListener('click', () => {
      navLinksMobile.classList.toggle('show');
      navLinksMobile.style.display = navLinksMobile.classList.contains('show') ? 'flex' : 'none';
    });
  }

  // Close menus when a link is clicked and bind sound to all nav links
  document.querySelectorAll('.nav-links a, .nav-links-mobile a').forEach(link => {
    bindClickSound(link);
    link.addEventListener('click', () => {
      navLinksMobile.classList.remove('show');
      navLinksMobile.style.display = 'none';
    });
  });

  // Also bind sound to the Trident Robotics logo button
  const navLogo = document.querySelector('.nav-logo');
  bindClickSound(navLogo);

  // ======= Google Sign-In & Tasks link dynamic creation =======
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: "635936985251-tj5uq36b5altf4qmk7019r3u504mm1fs.apps.googleusercontent.com",
      callback: (response) => {
        try {
          const data = jwt_decode(response.credential);
          const email = data.email;
          const allowedDomains = ["wths.net"];
          const allowedEmails = ["blackshocktrooper@gmail.com"];
          const allowed = allowedDomains.some(d => email.endsWith(`@${d}`)) || allowedEmails.includes(email);

          if (allowed) {
            // Desktop Tasks link
            if (!document.getElementById('tasksLink')) {
              const desktopLink = document.createElement('a');
              desktopLink.href = 'tasks.html';
              desktopLink.id = 'tasksLink';
              desktopLink.textContent = 'Tasks';
              desktopLink.style.display = 'inline-block';
              navLinks.appendChild(desktopLink);

              // Bind sound and close behavior
              bindClickSound(desktopLink);
            }

            // Mobile Tasks link
            if (!document.getElementById('tasksLinkMobile')) {
              const mobileLink = document.createElement('a');
              mobileLink.href = 'tasks.html';
              mobileLink.id = 'tasksLinkMobile';
              mobileLink.textContent = 'Tasks';
              mobileLink.style.display = 'block'; // vertical menu
              navLinksMobile.appendChild(mobileLink);

              bindClickSound(mobileLink);
              mobileLink.addEventListener('click', () => {
                navLinksMobile.classList.remove('show');
                navLinksMobile.style.display = 'none';
              });
            }

            // Ensure nav visibility updates after adding links
            updateNavVisibility();

          } else {
            alert("Access to Tasks is restricted to specific emails.");
          }

        } catch (err) {
          console.error("JWT decode error:", err);
        }
      }
    });

    // Render Google button
    google.accounts.id.renderButton(
      document.getElementById('googleSignIn'),
      { theme: "outline", size: "large", width: 250, text: "signin_with" }
    );

    google.accounts.id.prompt();
  } else {
    console.error("Google Sign-In script not loaded.");
  }
});
