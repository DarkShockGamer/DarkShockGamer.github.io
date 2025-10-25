document.addEventListener('DOMContentLoaded', function() {
  const navLinks = document.getElementById('navLinks');
  const navLinksMobile = document.getElementById('navLinksMobile');
  const navToggle = document.querySelector('.nav-toggle');

  function updateNavVisibility() {
    if (window.innerWidth <= 768) {
      navLinks.style.display = 'none';
      navLinksMobile.style.display = 'flex';
      navToggle.style.display = 'flex';
    } else {
      navLinks.style.display = 'flex';
      navLinksMobile.style.display = 'none';
      navToggle.style.display = 'none';
      navLinks.classList.remove('show');
      navLinksMobile.classList.remove('show');
    }
  }

  // Run on load
  updateNavVisibility();

  // Run on resize
  window.addEventListener('resize', updateNavVisibility);

  // Toggle mobile menu
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navLinksMobile.classList.toggle('show');
    });
  }

  // Close menus when a link is clicked
  document.querySelectorAll('.nav-links a, .nav-links-mobile a').forEach(link => {
    link.addEventListener('click', () => {
      navLinksMobile.classList.remove('show');
    });
  });

  // ======= Google Sign-In and Tasks Link =======
  const tasksLink = document.getElementById('tasksLink');
  const tasksLinkMobile = document.getElementById('tasksLinkMobile');
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
          tasksLink.style.display = allowed ? 'inline-block' : 'none';
          tasksLinkMobile.style.display = allowed ? 'inline-block' : 'none';
          if (!allowed) alert("Access to Tasks is restricted to specific emails.");
        } catch (err) {
          console.error("JWT decode error:", err);
        }
      }
    });

    google.accounts.id.renderButton(
      document.getElementById('googleSignIn'),
      { theme: "outline", size: "large", width: 250, text: "signin_with" }
    );

    google.accounts.id.prompt();
  }
});
