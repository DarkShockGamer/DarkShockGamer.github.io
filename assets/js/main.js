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
// Timeline Info Bubbles
document.querySelectorAll('.timeline-item').forEach(item => {
  item.addEventListener('click', () => {
    // Remove existing bubbles
    document.querySelectorAll('.timeline-item .info-bubble').forEach(bubble => bubble.remove());

    const infoText = item.dataset.info;
    if (!infoText) return;

    const bubble = document.createElement('div');
    bubble.className = 'info-bubble'; // still use 'info-bubble', scoped via parent
    bubble.textContent = infoText;

    item.appendChild(bubble);

    // Animate fade in
    requestAnimationFrame(() => bubble.classList.add('show'));
  });
});

// Close bubbles when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.timeline-item')) {
    document.querySelectorAll('.timeline-item .info-bubble').forEach(bubble => bubble.remove());
  }
});

