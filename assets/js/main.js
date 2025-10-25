document.addEventListener('DOMContentLoaded', () => {

  // ======= Mobile Navigation Toggle =======
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('navLinks');
  const navLinksMobile = document.getElementById('navLinksMobile');

  if (navToggle && navLinks && navLinksMobile) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', (!expanded).toString());

      // Toggle both navs
      navLinks.classList.toggle('show');
      navLinksMobile.classList.toggle('show');
    });

    // Close menus when a link is clicked
    document.querySelectorAll('.nav-links a, .nav-links-mobile a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('show');
        navLinksMobile.classList.remove('show');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ======= Timeline Info Bubbles =======
  document.querySelectorAll('.timeline-item').forEach(item => {
    const infoText = item.getAttribute('data-info');
    if (!infoText) return;

    const bubble = document.createElement('div');
    bubble.className = 'info-bubble';
    bubble.textContent = infoText;
    item.appendChild(bubble);

    item.addEventListener('click', e => {
      e.stopPropagation();
      // Close other bubbles
      document.querySelectorAll('.info-bubble.show').forEach(b => b.classList.remove('show'));
      bubble.classList.toggle('show');
    });
  });

  // Close bubbles when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.info-bubble.show').forEach(b => b.classList.remove('show'));
  });

  // ======= Google Sign-In and Tasks Link =======
  const clientId = "635936985251-tj5uq36b5altf4qmk7019r3u504mm1fs.apps.googleusercontent.com";
  const googleBtn = document.getElementById('googleSignIn');
  const desktopTasks = document.getElementById('tasksLink');
  const mobileTasks = document.getElementById('tasksLinkMobile');

  if (typeof google !== 'undefined' && google.accounts && google.accounts.id && googleBtn) {

    const handleCredential = response => {
      try {
        const data = jwt_decode(response.credential);
        const email = data.email;
        const allowedDomains = ["wths.net"];
        const allowedEmails = ["blackshocktrooper@gmail.com"];
        const canAccess = allowedDomains.some(d => email.endsWith(`@${d}`)) || allowedEmails.includes(email);

        desktopTasks.style.display = canAccess ? "inline-block" : "none";
        mobileTasks.style.display = canAccess ? "inline-block" : "none";

        if (!canAccess) alert("Access to Tasks is restricted to specific emails.");
      } catch (err) {
        console.error("JWT decode error:", err);
      }
    };

    google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
    google.accounts.id.renderButton(googleBtn, { theme: "outline", size: "large", width: 250, text: "signin_with" });
    google.accounts.id.prompt(); // optional One Tap

  } else {
    console.error("Google Sign-In script not loaded or element missing.");
  }

});
