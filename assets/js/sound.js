(function () {
  const Sound = (() => {
    const state = {
      ctx: null,
      master: null,
      enabled: true,
      resumeBound: false,
    };

    // Load persisted preference
    try {
      const saved = localStorage.getItem('trident_sound_enabled');
      if (saved === 'false') state.enabled = false;
    } catch {}

    function ensureCtx() {
      if (!state.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return; // No Web Audio support
        const ctx = new Ctx();
        const master = ctx.createGain();
        master.gain.value = state.enabled ? 0.5 : 0.0;
        master.connect(ctx.destination);
        state.ctx = ctx;
        state.master = master;
      }
      if (!state.resumeBound) {
        state.resumeBound = true;
        const resume = () => {
          if (state.ctx && state.ctx.state === 'suspended') state.ctx.resume();
          document.removeEventListener('pointerdown', resume, true);
        };
        document.addEventListener('pointerdown', resume, true);
      }
    }

    function setEnabled(on) {
      state.enabled = !!on;
      try { localStorage.setItem('trident_sound_enabled', String(!!on)); } catch {}
      ensureCtx();
      if (state.master) state.master.gain.value = on ? 0.5 : 0.0;
    }

    function tone({ freq = 440, type = 'sine', duration = 0.12, attack = 0.005, decay = 0.08, gain = 0.25, detune = 0 }) {
      if (!state.enabled) return;
      ensureCtx();
      if (!state.ctx || !state.master) return;
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

    function click() {
      tone({ freq: 240, type: 'triangle', duration: 0.08, attack: 0.002, decay: 0.06, gain: 0.22 });
    }

    function success() {
      tone({ freq: 660, type: 'sine', attack: 0.004, decay: 0.10, gain: 0.24 });
      setTimeout(() => tone({ freq: 880, type: 'sine', attack: 0.004, decay: 0.12, gain: 0.22 }), 90);
    }

    function warn() {
      tone({ freq: 320, type: 'square', attack: 0.003, decay: 0.15, gain: 0.2 });
    }

    function error() {
      tone({ freq: 220, type: 'square', attack: 0.002, decay: 0.2, gain: 0.25 });
      setTimeout(() => tone({ freq: 180, type: 'square', attack: 0.002, decay: 0.22, gain: 0.22 }), 90);
    }

    function info() {
      tone({ freq: 520, type: 'triangle', attack: 0.004, decay: 0.12, gain: 0.22 });
    }

    return { setEnabled, click, success, warn, error, info };
  })();

  // Export globally
  window.Sound = Sound;

  // Auto-bind: play sounds on clicks for common clickable elements
  // - Any element with [data-sound] plays the specified sound type
  // - Otherwise defaults to click() on <button>, [role=button], or <a>.btn
  let lastPlayAt = 0;
  function play(type) {
    const now = performance.now();
    if (now - lastPlayAt < 40) return; // guard rapid duplicate events
    lastPlayAt = now;
    (Sound[type] || Sound.click)();
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-sound], button, [role="button"], a.btn, .btn');
    if (!el) return;
    const attr = el.getAttribute && el.getAttribute('data-sound');
    const type = (attr || '').toLowerCase().trim();

    if (type) {
      // Only allow known types
      if (['click', 'success', 'warn', 'error', 'info'].includes(type)) play(type);
      else play('click');
      return;
    }

    // Default click for common button-like elements
    if (
      el.tagName === 'BUTTON' ||
      el.getAttribute?.('role') === 'button' ||
      (el.tagName === 'A' && (el.classList.contains('btn') || el.classList.contains('button')))
    ) {
      play('click');
    }
  }, true);
})();
