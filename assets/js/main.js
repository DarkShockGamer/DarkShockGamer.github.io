document.addEventListener('DOMContentLoaded', function() {
  const navLinks = document.getElementById('navLinks');
  const navLinksMobile = document.getElementById('navLinksMobile');
  const navToggle = document.querySelector('.nav-toggle');

  // ======= Navigation visibility =======
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

  // ======= Google Sign-In & Tasks link dynamic creation =======
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

          if (allowed) {
            // Only create Tasks links if allowed
            if (!document.getElementById('tasksLink')) {
              const desktopLink = document.createElement('a');
              desktopLink.href = 'tasks.html';
              desktopLink.id = 'tasksLink';
              desktopLink.textContent = 'Tasks';
              desktopLink.style.display = 'inline-block';
              navLinks.appendChild(desktopLink);
            }

            if (!document.getElementById('tasksLinkMobile')) {
              const mobileLink = document.createElement('a');
              mobileLink.href = 'tasks.html';
              mobileLink.id = 'tasksLinkMobile';
              mobileLink.textContent = 'Tasks';
              mobileLink.style.display = 'block'; // vertical menu
              navLinksMobile.appendChild(mobileLink);

              // Add click handler to close mobile menu when clicked
              mobileLink.addEventListener('click', () => {
                navLinksMobile.classList.remove('show');
              });
            }
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

    google.accounts.id.prompt(); // optional
  } else {
    console.error("Google Sign-In script not loaded.");
  }
});
