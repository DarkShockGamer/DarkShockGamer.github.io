document.addEventListener('DOMContentLoaded', function() {
  // ======= Elements =======
  const navLinks = document.getElementById('navLinks');
  const navLinksMobile = document.getElementById('navLinksMobile');
  const navToggle = document.querySelector('.nav-toggle');
  const tasksLink = document.getElementById('tasksLink');
  const tasksLinkMobile = document.getElementById('tasksLinkMobile');

  // ======= Navigation visibility =======
  function updateNavVisibility() {
    if (window.innerWidth <= 768) {
      // Mobile
      navLinks.style.display = 'none';
      navLinksMobile.style.display = 'flex';
      navToggle.style.display = 'flex';
    } else {
      // Desktop
      navLinks.style.display = 'flex';
      navLinksMobile.style.display = 'none';
      navToggle.style.display = 'none';
      navLinks.classList.remove('show');
      navLinksMobile.classList.remove('show');
    }
  }

  // Initialize visibility
  updateNavVisibility();
  window.addEventListener('resize', updateNavVisibility);

  // ======= Mobile menu toggle =======
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navLinksMobile.classList.toggle('show');
    });
  }

  // Close menus when a link is clicked
  document.querySelectorAll('.nav-links a, .nav-links-mobile a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('show');
      navLinksMobile.classList.remove('show');
    });
  });

  // ======= Google Sign-In & Tasks Link =======
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {

    function handleCredentialResponse(response) {
      try {
        const data = jwt_decode(response.credential);
        const email = data.email;

        const allowedDomains = ["wths.net"];
        const allowedEmails = ["blackshocktrooper@gmail.com"];
        const allowed = allowedDomains.some(d => email.endsWith(`@${d}`)) || allowedEmails.includes(email);

        // Show/hide tasks links
        if (tasksLink) tasksLink.style.display = allowed ? 'inline-block' : 'none';
        if (tasksLinkMobile) tasksLinkMobile.style.display = allowed ? 'block' : 'none';

        if (!allowed) alert("Access to Tasks is restricted to specific emails.");
      } catch (err) {
        console.error("JWT decode error:", err);
      }
    }

    google.accounts.id.initialize({
      client_id: "YOUR_CLIENT_ID",
      callback: handleCredentialResponse,
      auto_select: false
    });

    google.accounts.id.renderButton(
      document.getElementById('googleSignIn'),
      { theme: "outline", size: "large", width: 250, text: "signin_with" }
    );

    google.accounts.id.prompt(); // optional One Tap
  } else {
    console.error("Google Sign-In script not loaded.");
  }
});
