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

    // Create info bubble
    const bubble = document.createElement('div');
    bubble.className = 'info-bubble';
    bubble.textContent = infoText;
    item.appendChild(bubble);

    // Toggle bubble on click/tap only
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close all other bubbles first
      document.querySelectorAll('.info-bubble.show').forEach(b => b.classList.remove('show'));
      bubble.classList.toggle('show');
    });
  });

  // Hide bubbles when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.info-bubble.show').forEach(bubble => bubble.classList.remove('show'));
  });

  // ======= Google Login Button =======
  const googleBtn = document.getElementById('googleSignIn');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID", // replace with your client ID
        callback: (response) => {
          console.log("Encoded JWT ID token:", response.credential);
          // send to backend if needed
        }
      });
      google.accounts.id.prompt(); // optional: show One Tap
    });
  }
});
