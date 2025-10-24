document.addEventListener('DOMContentLoaded', function() {

  // ======= Mobile Navigation Toggle =======
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function() {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', (!expanded).toString());
      navLinks.classList.toggle('show');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('show'));
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
      document.querySelectorAll('.info-bubble.show').forEach(b => b.classList.remove('show'));
      bubble.classList.toggle('show');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.info-bubble.show').forEach(bubble => bubble.classList.remove('show'));
  });

  // ======= Google Sign-In =======
  const clientId = "635936985251-3p4cgja9c0k7fngn3pcblme307p0c8jm.apps.googleusercontent.com";

  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      console.log("Encoded JWT ID token:", response.credential);
      // send token to backend if needed
    }
  });

  const googleBtn = document.getElementById('googleSignIn');
  if (googleBtn) {
    google.accounts.id.renderButton(
      googleBtn, 
      { theme: "outline", size: "large", width: 250 }
    );

    // Optional: show One Tap automatically
    google.accounts.id.prompt();
  }

});

