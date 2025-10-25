document.addEventListener('DOMContentLoaded', function() {

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

  // ======= Google Sign-In & Tasks link =======
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {

    google.accounts.id.initialize({
      client_id: "YOUR_CLIENT_ID",
      callback: (response) => {
        try {
          const data = jwt_decode(response.credential);
          const email = data.email;
          const allowedDomains = ["wths.net"];
          const allowedEmails = ["blackshocktrooper@gmail.com"];
          const allowed = allowedDomains.some(d => email.endsWith(`@${d}`)) || allowedEmails.includes(email);

          // Show/hide tasks links
          tasksLink.style.display = allowed ? 'inline-block' : 'none';          // desktop
          tasksLinkMobile.style.display = allowed ? 'flex' : 'none';           // mobile (flex for nav-links-mobile)

          if (!allowed) alert("Access to Tasks is restricted to specific emails.");
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

    // Optional: One Tap
    google.accounts.id.prompt();
  } else {
    console.error("Google Sign-In script not loaded.");
  }

});
