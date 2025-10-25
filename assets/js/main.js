document.addEventListener('DOMContentLoaded', function() {

  // ======= Mobile Navigation Toggle =======
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('navLinks');
  const navLinksMobile = document.getElementById('navLinksMobile');

  if (navToggle && navLinks && navLinksMobile) {
    navToggle.addEventListener('click', function() {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', (!expanded).toString());

      navLinks.classList.toggle('show');
      navLinksMobile.classList.toggle('show');
    });

    // Close menus when a link is clicked
    document.querySelectorAll('.nav-links a, .nav-links-mobile a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('show');
        navLinksMobile.classList.remove('show');
      });
    });
  }

  // ======= Timeline Info Bubbles =======
  const timelineItems = document.querySelectorAll('.timeline-item');
  timelineItems.forEach(item => {
    const infoText = item.getAttribute('data-info');
    if (!infoText) return;

    const bubble = document.createElement('div');
    bubble.className = 'info-bubble';
    bubble.textContent = infoText;
    item.appendChild(bubble);

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other bubbles
      document.querySelectorAll('.info-bubble.show').forEach(b => b.classList.remove('show'));
      bubble.classList.toggle('show');
    });
  });

  // Close bubbles when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.info-bubble.show').forEach(bubble => bubble.classList.remove('show'));
  });

  // ======= Google Sign-In =======
  const clientId = "635936985251-tj5uq36b5altf4qmk7019r3u504mm1fs.apps.googleusercontent.com";

  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        try {
          const data = jwt_decode(response.credential);
          const email = data.email;
          const allowedDomains = ["wths.net"];
          const allowedEmails = ["blackshocktrooper@gmail.com"];

          if (
            allowedDomains.some(domain => email.endsWith(`@${domain}`)) ||
            allowedEmails.includes(email)
          ) {
            document.getElementById("tasksLink").style.display = "inline-block";
            document.getElementById("tasksLinkMobile").style.display = "inline-block";
          } else {
            document.getElementById("tasksLink").style.display = "none";
            document.getElementById("tasksLinkMobile").style.display = "none";
            alert("Access to Tasks is restricted to specific emails.");
          }
        } catch (err) {
          console.error("Error decoding JWT:", err);
        }
      }
    });

    const googleBtn = document.getElementById('googleSignIn');
    if (googleBtn) {
      // Render Google Sign-In button
      google.accounts.id.renderButton(
        googleBtn,
        { theme: "outline", size: "large", width: 250, text: "signin_with" }
      );

      // Optional: show One Tap automatically
      google.accounts.id.prompt();
    }

  } else {
    console.error("Google Sign-In script not loaded.");
  }

});
