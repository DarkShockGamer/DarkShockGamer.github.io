document.addEventListener('DOMContentLoaded', function() {
  const navLinks = document.getElementById('navLinks');
  const navLinksMobile = document.getElementById('navLinksMobile');
  const navToggle = document.querySelector('.nav-toggle');

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

  // ======= Bind sound to Tasks links (if they exist and become visible) =======
  // Tasks links are managed by the centralized auth logic in index.html
  // We just need to bind sound effects to them
  const tasksLink = document.getElementById('tasksLink');
  const tasksLinkMobile = document.getElementById('tasksLinkMobile');
  
  if (tasksLink) {
    bindClickSound(tasksLink);
  }
  
  if (tasksLinkMobile) {
    bindClickSound(tasksLinkMobile);
    tasksLinkMobile.addEventListener('click', () => {
      navLinksMobile.classList.remove('show');
      navLinksMobile.style.display = 'none';
    });
  }
});
