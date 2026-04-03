/* ─── UI Component Lab — Shared JavaScript ──────────────────────────────────── */

// ─── Sound Engine ─────────────────────────────────────────────────────────────
window.Sound = (() => {
  const state = {
    ctx: null,
    master: null,
    enabled: true,
    prefersReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  function ensureCtx() {
    if (!state.ctx) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
      state.ctx = ctx;
      state.master = master;
      const resume = () => {
        if (ctx.state === 'suspended') ctx.resume();
        document.removeEventListener('pointerdown', resume, true);
      };
      document.addEventListener('pointerdown', resume, true);
    }
  }

  function setEnabled(on) {
    state.enabled = on;
    if (state.master) state.master.gain.value = on ? 0.6 : 0.0;
  }

  function isEnabled() { return state.enabled; }

  function tone({ freq = 440, type = 'sine', duration = 0.12, attack = 0.005, decay = 0.08, gain = 0.3, detune = 0 }) {
    if (!state.enabled) return;
    ensureCtx();
    const t0 = state.ctx.currentTime;
    const osc = state.ctx.createOscillator();
    const g = state.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (detune) osc.detune.setValueAtTime(detune, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    osc.connect(g).connect(state.master);
    osc.start(t0);
    osc.stop(t0 + Math.max(duration, attack + decay));
  }

  function click()     { tone({ freq: 240, type: 'triangle', duration: 0.08, attack: 0.002, decay: 0.06, gain: 0.22 }); }
  function success()   { tone({ freq: 660, type: 'sine', attack: 0.004, decay: 0.10, gain: 0.25 }); setTimeout(() => tone({ freq: 880, type: 'sine', attack: 0.004, decay: 0.12, gain: 0.23 }), 90); }
  function warn()      { tone({ freq: 320, type: 'square', attack: 0.003, decay: 0.15, gain: 0.2 }); }
  function error()     { tone({ freq: 220, type: 'square', attack: 0.002, decay: 0.2, gain: 0.25 }); setTimeout(() => tone({ freq: 180, type: 'square', attack: 0.002, decay: 0.22, gain: 0.22 }), 90); }
  function info()      { tone({ freq: 520, type: 'triangle', attack: 0.004, decay: 0.12, gain: 0.22 }); }
  function toggle()    { tone({ freq: 380, type: 'square', attack: 0.002, decay: 0.10, gain: 0.18 }); }
  function tab()       { tone({ freq: 700, type: 'triangle', attack: 0.004, decay: 0.11, gain: 0.19 }); }
  function iconChime() { tone({ freq: 820, type: 'triangle', attack: 0.004, decay: 0.14, gain: 0.16 }); setTimeout(() => tone({ freq: 1220, type: 'sine', attack: 0.003, decay: 0.12, gain: 0.13 }), 110); }
  function morph()     { tone({ freq: 560, type: 'triangle', attack: 0.008, decay: 0.16, gain: 0.22 }); setTimeout(() => tone({ freq: 900, type: 'sine', attack: 0.005, decay: 0.14, gain: 0.19 }), 110); }
  function whoosh() {
    if (state.prefersReduced || !state.enabled) return;
    ensureCtx();
    const t0 = state.ctx.currentTime;
    const bufferSize = 2 * state.ctx.sampleRate;
    const noiseBuffer = state.ctx.createBuffer(1, bufferSize, state.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = state.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = state.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(400, t0);
    const g = state.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    noise.connect(filter).connect(g).connect(state.master);
    noise.start(t0);
    noise.stop(t0 + 0.5);
  }

  return { setEnabled, isEnabled, click, success, warn, error, info, toggle, tab, iconChime, morph, whoosh };
})();

// ─── Ripple Helper ────────────────────────────────────────────────────────────
window.addRipple = function addRipple(e) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const span = document.createElement('span');
  span.className = 'ripple';
  span.style.width = span.style.height = size + 'px';
  span.style.left = (e.clientX - rect.left) + 'px';
  span.style.top  = (e.clientY - rect.top) + 'px';
  btn.appendChild(span);
  span.addEventListener('animationend', () => span.remove());
};

// ─── Toast Notifications ──────────────────────────────────────────────────────
window.showToast = function showToast(type, message, timeout = 3500) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');
  const icon = { success: '✅', info: 'ℹ️', warn: '⚠️', error: '⛔' }[type] || 'ℹ️';
  el.innerHTML = `
    <span aria-hidden="true">${icon}</span>
    <div class="text-sm">${message}</div>
    <button style="padding:.2rem .35rem;border-radius:.25rem;background:transparent;border:none;cursor:pointer;opacity:.5;font-size:1rem;line-height:1;transition:opacity 150ms" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.5" title="Dismiss">✕</button>
  `;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));

  if (window.Sound) {
    if (type === 'success') Sound.success();
    else if (type === 'info')    Sound.info();
    else if (type === 'warn')    Sound.warn();
    else if (type === 'error')   Sound.error();
  }

  const close = () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 220);
  };
  el.querySelector('button').addEventListener('click', close);
  const tid = setTimeout(close, timeout);
  el.addEventListener('pointerenter', () => clearTimeout(tid), { once: true });
};

// ─── DOMContentLoaded Setup ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Auto-attach ripple + sound to .btn-ripple[data-sound]
  document.querySelectorAll('.btn-ripple').forEach(btn => {
    btn.addEventListener('click', addRipple);
    const soundType = btn.getAttribute('data-sound');
    if (soundType && window.Sound) {
      btn.addEventListener('click', () => {
        const s = window.Sound;
        if (soundType === 'click')     s.click();
        else if (soundType === 'success') s.success();
        else if (soundType === 'warn')    s.warn();
        else if (soundType === 'error')   s.error();
        else if (soundType === 'info')    s.info();
        else if (soundType === 'toggle')  s.toggle();
        else if (soundType === 'tab')     s.tab();
        else if (soundType === 'morph')   s.morph();
        else if (soundType === 'whoosh')  s.whoosh();
        else if (soundType === 'chime')   s.iconChime();
      });
    }
  });

  // Sound toggle button (id="toggleSound")
  const toggleSoundBtn = document.getElementById('toggleSound');
  if (toggleSoundBtn) {
    toggleSoundBtn.addEventListener('click', () => {
      const nowOn = window.Sound.isEnabled();
      window.Sound.setEnabled(!nowOn);
      toggleSoundBtn.textContent = `🔊 Sound: ${nowOn ? 'Off' : 'On'}`;
      if (!nowOn) window.Sound.info();
    });
  }

  // Scroll-reveal via IntersectionObserver
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }
});
