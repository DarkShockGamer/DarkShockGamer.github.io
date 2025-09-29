document.addEventListener('DOMContentLoaded', function () {
  // ===== Navigation Toggle =====
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', function () {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', (!expanded).toString());
    navLinks.classList.toggle('show');
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('show'));
  });

  // ===== Timeline Info Bubbles =====
  document.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', () => {
      // Remove any existing bubbles
      document.querySelectorAll('.info-bubble').forEach(bubble => bubble.remove());

      // Create new bubble
      const bubble = document.createElement('div');
      bubble.className = 'info-bubble';
      bubble.textContent = item.dataset.info;

      item.appendChild(bubble);

      // Optional: remove bubble after 5 seconds
      setTimeout(() => {
        bubble.remove();
      }, 5000);
    });
  });
});
