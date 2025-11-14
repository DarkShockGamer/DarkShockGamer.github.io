(function() {
  // Unified Toast Component for Trident Robotics
  // Supports both showToast(type, message, timeout) and Toast(message, type, timeout) signatures
  
  const stack = document.getElementById('toastStack');
  if (!stack) {
    // Graceful fallback if toastStack doesn't exist
    window.showToast = () => {};
    window.Toast = () => {};
    return;
  }

  // SVG icons for different toast types
  const ICONS = {
    success: '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M7.629 13.314l-3.39-3.39a1 1 0 10-1.414 1.414l4.097 4.098a1 1 0 001.414 0l8.485-8.485a1 1 0 00-1.414-1.414L7.63 13.314z"/></svg>',
    info:    '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9 9h1v4H9V9zm0-3h1v1H9V6z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16z" clip-rule="evenodd"/></svg>',
    warn:    '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.582A1.75 1.75 0 0116.518 17H3.482A1.75 1.75 0 011.74 14.681L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-6a.75.75 0 00-.75.75v3.5c0 .414.336.75.75.75s.75-.336.75-.75v-3.5A.75.75 0 0010 7z"/></svg>',
    error:   '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>'
  };

  function removeWithTransition(el) {
    if (!el) return;
    el.classList.remove('show');
    const onEnd = (ev) => {
      if (ev.target === el) {
        el.removeEventListener('transitionend', onEnd);
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    };
    el.addEventListener('transitionend', onEnd);
    // Fallback if transitionend doesn't fire
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
  }

  function showToast(type = 'info', message = '', timeout = 10000) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <span class="toast-icon-wrapper">${ICONS[type] || ICONS.info}</span>
      <div class="toast-message text-sm">${message}</div>
      <button aria-label="Dismiss">&times;</button>
    `;
    stack.appendChild(el);

    requestAnimationFrame(() => el.classList.add('show'));

    // Try to play a matching sound (graceful - won't break if Sound isn't loaded yet)
    try {
      if (window.Sound && typeof window.Sound.play === 'function') {
        window.Sound.play(type);
      } else if (window.Sound) {
        // Fallback to direct method calls
        if (type === 'success' && typeof window.Sound.success === 'function') window.Sound.success();
        else if (type === 'info' && typeof window.Sound.info === 'function') window.Sound.info();
        else if (type === 'warn' && typeof window.Sound.warn === 'function') window.Sound.warn();
        else if (type === 'error' && typeof window.Sound.error === 'function') window.Sound.error();
      }
    } catch (e) { 
      console.debug('Toast sound error (non-critical):', e); 
    }

    el.querySelector('button')?.addEventListener('click', () => removeWithTransition(el));

    let start = Date.now();
    let remaining = timeout;
    let timer = setTimeout(() => removeWithTransition(el), remaining);

    const pause = () => { 
      clearTimeout(timer); 
      remaining -= (Date.now() - start); 
    };
    const resume = () => { 
      start = Date.now(); 
      clearTimeout(timer); 
      timer = setTimeout(() => removeWithTransition(el), Math.max(0, remaining)); 
    };

    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
  }

  // Export both function signatures for compatibility
  window.showToast = showToast;
  
  // Keep existing Toast(message, type, timeout) signature working
  window.Toast = (message = '', type = 'info', timeout) => showToast(type, message, timeout);
})();
