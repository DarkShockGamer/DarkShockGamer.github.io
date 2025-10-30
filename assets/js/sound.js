(function () {
  // --- Sound engine (Web Audio) ---
  const Sound = (() => {
    const state = {
      ctx: null,
      master: null,
      enabled: true,
      resumeBound: false
    };

    // Load saved preference
    try {
      const saved = localStorage.getItem('trident_sound_enabled');
      if (saved === 'false') state.enabled = false;
    } catch {}

    function ensureCtx() {
      if (!state.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const master = ctx.createGain();
        master.gain.value = state.enabled ? 0.5 : 0.0;
        master.connect(ctx.destination);
        state.ctx = ctx;
        state.master = master;
      }
      if (!state.resumeBound) {
        state.resumeBound = true;
        const unlock = () => {
          if (state.ctx && state.ctx.state === 'suspended') state.ctx.resume();
        };
        // Unlock on common user gestures (helps Safari/iOS, keyboard users)
        ['pointerdown', 'touchend', 'keydown'].forEach(evt => {
          document.addEventListener(evt, unlock, { capture: true, once: true });
        });
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

    // Drawer "whoosh" — filtered noise with quick rise and smooth fade
    function whoosh() {
      if (!state.enabled) return;
      ensureCtx();
      if (!state.ctx || !state.master) return;

      const t0 = state.ctx.currentTime;
      const bufferSize = 2 * state.ctx.sampleRate; // ~2s of noise, we'll stop sooner
      const noiseBuffer = state.ctx.createBuffer(1, bufferSize, state.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = state.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = state.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(400, t0);

      const g = state.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.22, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);

      noise.connect(filter).connect(g).connect(state.master);
      noise.start(t0);
      noise.stop(t0 + 0.5);
    }

    // Initialize early so unlock handlers are in place before the first click
    ensureCtx();

    return { setEnabled, click, success, warn, error, info, whoosh, checkOn, checkOff };
  })();

  // Expose for optional controls
  window.Sound = Sound;

  // --- Auto-mapping rules ---
  // You can override or extend these at runtime via window.tridentSoundAutoMap
  const defaultMap = {
    error: [
      /(^|[-_ ])(danger|error|delete|remove|trash|destructive|destroy)([-_ ]|$)/i
    ],
    success: [
      /(^|[-_ ])(save|confirm|submit|create|add|ok|done|primary)([-_ ]|$)/i
    ],
    warn: [
      /(^|[-_ ])(warn|warning|caution|amber)([-_ ]|$)/i
    ],
    info: [
      /(^|[-_ ])(info|help|learn|details|more)([-_ ]|$)/i
    ]
  };
  window.tridentSoundAutoMap = window.tridentSoundAutoMap || defaultMap;

  function textOf(el) {
    const s = (el.getAttribute?.('aria-label') || el.value || el.textContent || '').trim().toLowerCase();
    return s.replace(/\s+/g, ' ');
  }

  function classIdOf(el) {
    return ((el.className || '') + ' ' + (el.id || '')).toLowerCase();
  }

  function computeAutoSound(el) {
    // Respect explicit data-sound
    const ds = el.getAttribute && el.getAttribute('data-sound');
    if (ds) return null;

    const hay = textOf(el) + ' ' + classIdOf(el);

    for (const [type, patterns] of Object.entries(window.tridentSoundAutoMap)) {
      if (patterns.some((re) => re.test(hay))) return type;
    }
    return null;
  }

  function autoDecorate(root = document) {
    const nodes = root.querySelectorAll('button, [role="button"], a, .btn, .button, input[type="submit"], input[type="button"]');
    nodes.forEach((el) => {
      // Skip if already has explicit mapping
      if (el.hasAttribute('data-sound')) return;
      const type = computeAutoSound(el);
      if (type) el.setAttribute('data-sound', type);
    });
  }

  // Decorate on start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => autoDecorate());
  } else {
    autoDecorate();
  }

  // Observe dynamic changes
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return;
        autoDecorate(n);
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // --- Playback binding ---
  let lastPlayAt = 0;
  function play(type) {
    // alias "static" to "click"
    if (type === 'static') type = 'click';
    const now = performance.now();
    if (now - lastPlayAt < 40) return; // avoid double-fire on nested elements
    lastPlayAt = now;
    (Sound[type] || Sound.click)();
  }

  function isNavigationalAnchor(a) {
    if (!a || a.tagName !== 'A') return false;
    const href = (a.getAttribute('href') || '').trim();
    if (!href) return false;
    // Consider anything not a pure in-page anchor a navigation
    if (href === '#' || href.startsWith('#')) return false;
    return true;
  }

  // Click binding: capture phase to get the nearest actionable ancestor
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-sound], a[href], button, [role="button"], .btn, .button, input[type="submit"], input[type="button"]');
    if (!el) return;

    // Explicit sound takes priority
    const attr = el.getAttribute && el.getAttribute('data-sound');
    if (attr) {
      const type = attr.toLowerCase().trim();
      if (['click', 'static', 'success', 'warn', 'error', 'info'].includes(type)) play(type);
      else play('click');
      return;
    }

    // Links: always play static click for navigational anchors
    if (isNavigationalAnchor(el)) {
      play('static');
      return;
    }

    // Default click for buttons and button-like
    if (
      el.tagName === 'BUTTON' ||
      el.getAttribute?.('role') === 'button' ||
      el.classList.contains('btn') ||
      el.classList.contains('button') ||
      (el.tagName === 'INPUT' && (el.type === 'submit' || el.type === 'button'))
    ) {
      play('click');
    }
  }, true);

  // Keyboard activation (Enter/Space on button-like elements)
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const isEnter = e.key === 'Enter';
    const isSpace = e.key === ' ';
    if (!isEnter && !isSpace) return;
    const el = e.target;
    if (!(el instanceof Element)) return;

    // Explicit mapping?
    if (el.hasAttribute('data-sound')) {
      const type = el.getAttribute('data-sound')?.toLowerCase().trim();
      if (type) play(type);
      return;
    }

    // Enter on links counts as navigation
    if (isEnter && el.tagName === 'A' && isNavigationalAnchor(el)) {
      play('static');
      return;
    }

    // Space/Enter on button-like
    if (
      el.tagName === 'BUTTON' ||
      el.getAttribute?.('role') === 'button' ||
      el.classList.contains('btn') ||
      el.classList.contains('button') ||
      (el.tagName === 'INPUT' && (el.type === 'submit' || el.type === 'button'))
    ) {
      play('click');
    }
  }, true);

  // New: checklist checkbox sound binding for description checklists
  document.addEventListener('change', (e) => {
    const cb = e.target && e.target.closest && e.target.closest('.desc-checkbox');
    if (!cb || cb.disabled) return;
    if (cb.checked) {
      Sound.checkOn();
    } else {
      Sound.checkOff();
    }
  }, true);

  // Export helper to decorate any container you inject dynamically
  window.tridentDecorateSounds = autoDecorate;
})();
