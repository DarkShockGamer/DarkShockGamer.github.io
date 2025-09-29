document.addEventListener('DOMContentLoaded', function() {
  // ======= Mobile Navigation Toggle =======
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', function() {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', (!expanded).toString());
    navLinks.classList.toggle('show');
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('show'));
  });

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

    // Show/hide on hover (desktop)
    item.addEventListener('mouseenter', () => bubble.classList.add('show'));
    item.addEventListener('mouseleave', () => bubble.classList.remove('show'));

    // Show/hide on click/tap (mobile)
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      bubble.classList.toggle('show');
    });
  });

  // Hide any open info bubbles when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.info-bubble.show').forEach(bubble => {
      bubble.classList.remove('show');
    });
  });
});
