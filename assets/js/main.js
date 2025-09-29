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

      // Only show bubble if there is data-info
      const infoText = item.dataset.info;
      if (!infoText) return;

      // Create new bubble
      const bubble = document.createElement('div');
      bubble.className = 'info-bubble';
      bubble.textContent = infoText;

      item.appendChild(bubble);

      // Force it to display (if CSS was hiding)
      bubble.style.display = 'block';
    });
  });
});
