document.addEventListener('DOMContentLoaded', function() {

  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('navLinks');
  const navLinksMobile = document.getElementById('navLinksMobile');
  const tasksLink = document.getElementById('tasksLink');
  const tasksLinkMobile = document.getElementById('tasksLinkMobile');

  // ======= Responsive Menu Toggle =======
  function toggleMenu() {
    if (window.innerWidth <= 768) {
      navLinksMobile.classList.toggle('show');
    } else {
      navLinks.classList.toggle('show');
    }
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', (!expanded).toString());
      toggleMenu();
    });
  }

  // Close menus when a link is clicked
  document.querySelectorAll('.nav-links a, .nav-links-mobile a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('show');
      navLinksMobile.classList.remove('show');
    });
  });

  // ======= Google Sign-In =======
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    const clientId = "635936985251-tj5uq36b5altf4qmk7019r3u504mm1fs.apps.googleusercontent.com";

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        try {
          const data = jwt_decode(response.credential);
          const email = data.email;
          const allowedDomains = ["wths.net"];
          const allowedEmails = ["blackshocktrooper@gmail.com"];

          const allowed = allowedDomains.some(d => email.endsWith(`@${d}`)) || allowedEmails.includes(email);

          tasksLink.style.display = allowed ? "inline-block" : "none";
          tasksLinkMobile.style.display = allowed ? "inline-block" : "none";

          if (!allowed) alert("Access to Tasks is restricted to specific emails.");
        } catch (err) {
          console.error("Error decoding JWT:", err);
        }
      }
    });

    google.accounts.id.renderButton(
      document.getElementById('googleSignIn'),
      { theme: "outline", size: "large", width: 250, text: "signin_with" }
    );

    google.accounts.id.prompt();
  }

  // ======= Timeline Info Bubbles =======
  document.querySelectorAll('.timeline-item').forEach(item => {
    const infoText = item.getAttribute('data-info');
    if (!infoText) return;

    const bubble = document.createElement('div');
    bubble.className = 'info-bubble';
    bubble.textContent = infoText;
    item.appendChild(bubble);

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.info-bubble.show').forEach(b => b.classList.remove('show'));
      bubble.classList.toggle('show');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.info-bubble.show').forEach(b => b.classList.remove('show'));
  });

  // ======= Optional: Hide mobile nav if resizing =======
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      navLinksMobile.classList.remove('show');
    } else {
      navLinks.classList.remove('show');
    }
  });

});
