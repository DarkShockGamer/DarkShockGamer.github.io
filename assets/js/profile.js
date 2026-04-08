/**
 * Profile system for Trident Robotics site.
 *
 * Stores user profiles keyed by normalised Google email address in localStorage.
 * Each entry: { displayName, picture, badges: [{id, name, emoji, color}] }
 *
 * Exposes: window.Profile
 */
(function () {
  'use strict';

  const PROFILES_KEY = 'trident.profiles';
  const BADGE_DEFS_KEY = 'trident.badge_defs';

  // Built-in badge definitions – developers can extend via the developer page.
  const DEFAULT_BADGE_DEFS = [
    { id: 'captain',     name: 'Captain',          emoji: '⭐', color: '#f59e0b' },
    { id: 'mentor',      name: 'Mentor',            emoji: '🎓', color: '#10b981' },
    { id: 'developer',   name: 'Developer',         emoji: '💻', color: '#6366f1' },
    { id: 'team-member', name: 'Team Member',       emoji: '🛡️', color: '#0ea5e9' },
    { id: 'design',      name: 'Design Lead',       emoji: '🎨', color: '#ec4899' },
    { id: 'mechanical',  name: 'Mechanical Lead',   emoji: '🔧', color: '#f97316' },
    { id: 'programming', name: 'Programming Lead',  emoji: '⚡', color: '#3b82f6' },
    { id: 'electrical',  name: 'Electrical Lead',   emoji: '🔌', color: '#eab308' },
    { id: 'business',    name: 'Business Lead',     emoji: '📊', color: '#8b5cf6' },
  ];

  // ── helpers ──────────────────────────────────────────────────────────────

  function normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
  }

  function getAllProfiles() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveAllProfiles(profiles) {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.error('[Profile] Failed to save profiles:', e);
    }
  }

  // ── core profile CRUD ────────────────────────────────────────────────────

  function getProfile(email) {
    if (!email) return null;
    return getAllProfiles()[normalizeEmail(email)] || null;
  }

  function setProfile(email, data) {
    if (!email) return null;
    const profiles = getAllProfiles();
    const key = normalizeEmail(email);
    profiles[key] = Object.assign({}, profiles[key] || {}, data);
    saveAllProfiles(profiles);
    return profiles[key];
  }

  // ── display helpers ──────────────────────────────────────────────────────

  function getDisplayName(email) {
    const p = getProfile(email);
    if (p && p.displayName) return p.displayName;
    return email || 'Unknown User';
  }

  function getPicture(email) {
    const p = getProfile(email);
    if (!p) return null;
    // Prefer user-chosen avatar override over the Google picture.
    if (p.avatarOverride) return p.avatarOverride;
    return p.picture || null;
  }

  function getBanner(email) {
    const p = getProfile(email);
    return (p && p.banner) ? p.banner : null;
  }

  function setAvatarOverride(email, urlOrNull) {
    if (!email) return;
    setProfile(email, { avatarOverride: urlOrNull || null });
  }

  function setBanner(email, urlOrNull) {
    if (!email) return;
    setProfile(email, { banner: urlOrNull || null });
  }

  // ── badge management ─────────────────────────────────────────────────────

  function getBadges(email) {
    const p = getProfile(email);
    return (p && Array.isArray(p.badges)) ? p.badges : [];
  }

  function addBadge(email, badge) {
    if (!email || !badge || !badge.id) return;
    const badges = getBadges(email).filter(b => b.id !== badge.id);
    badges.push(badge);
    setProfile(email, { badges });
  }

  function removeBadge(email, badgeId) {
    if (!email || !badgeId) return;
    const badges = getBadges(email).filter(b => b.id !== badgeId);
    setProfile(email, { badges });
  }

  // ── badge definitions ────────────────────────────────────────────────────

  function getBadgeDefs() {
    try {
      const raw = localStorage.getItem(BADGE_DEFS_KEY);
      const custom = raw ? JSON.parse(raw) : [];
      const all = [...DEFAULT_BADGE_DEFS];
      custom.forEach(b => { if (!all.find(d => d.id === b.id)) all.push(b); });
      return all;
    } catch (e) {
      return [...DEFAULT_BADGE_DEFS];
    }
  }

  function saveBadgeDef(badge) {
    if (!badge || !badge.id) return;
    try {
      const raw = localStorage.getItem(BADGE_DEFS_KEY);
      const custom = raw ? JSON.parse(raw) : [];
      const idx = custom.findIndex(b => b.id === badge.id);
      if (idx >= 0) custom[idx] = badge; else custom.push(badge);
      localStorage.setItem(BADGE_DEFS_KEY, JSON.stringify(custom));
    } catch (e) {}
  }

  // ── Google sign-in integration ───────────────────────────────────────────

  /**
   * Called on Google sign-in to persist picture.
   * Does NOT overwrite a display name the user has already set.
   */
  function saveGoogleProfile(email, googleName, picture) {
    if (!email) return;
    const existing = getProfile(email) || {};
    const updates = {};
    if (picture) updates.picture = picture;
    // Only seed display name from Google if user hasn't set one yet.
    if (!existing.displayName && googleName) updates.displayName = googleName;
    setProfile(email, updates);
  }

  // ── rendering helpers ────────────────────────────────────────────────────

  /**
   * Returns an HTML string for a user avatar (img with initials fallback).
   * @param {string} email
   * @param {number} size - px dimensions
   */
  function renderAvatar(email, size) {
    size = size || 32;
    const picture = getPicture(email);
    const name = getDisplayName(email);
    const initials = ((name && name[0]) || '?').toUpperCase();
    const fontSize = Math.round(size * 0.45);
    // Base styles shared between visible and hidden fallback span (no display property here
    // so that display:none / display:inline-flex can be applied without being overridden)
    const baseStyle =
      'width:' + size + 'px;height:' + size + 'px;border-radius:50%;' +
      'background:linear-gradient(135deg,#38bdf8,#818cf8);color:white;' +
      'font-size:' + fontSize + 'px;font-weight:700;' +
      'align-items:center;justify-content:center;flex-shrink:0;';

    if (picture) {
      return '<img src="' + picture + '" alt="' + _esc(name) +
        '" width="' + size + '" height="' + size + '" ' +
        'style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;flex-shrink:0;" ' +
        'onerror="this.style.display=\'none\';var s=this.nextElementSibling;if(s)s.style.display=\'inline-flex\';" />' +
        '<span aria-hidden="true" style="display:none;' + baseStyle + '">' + _esc(initials) + '</span>';
    }
    return '<span aria-hidden="true" style="display:inline-flex;' + baseStyle + '">' + _esc(initials) + '</span>';
  }

  /** Returns HTML for a user's badge chips */
  function renderBadges(email) {
    const badges = getBadges(email);
    if (!badges.length) return '';
    return badges.map(function (b) {
      return '<span title="' + _esc(b.name) + '" style="display:inline-flex;align-items:center;gap:3px;' +
        'padding:2px 8px;border-radius:9999px;font-size:0.7rem;font-weight:700;' +
        'background:' + b.color + '22;color:' + b.color + ';border:1px solid ' + b.color + '66;">' +
        _esc(b.emoji) + ' ' + _esc(b.name) + '</span>';
    }).join(' ');
  }

  /**
   * Returns an HTML string for a profile banner image.
   * Falls back to an empty string (no element) when no banner is set.
   * @param {string} email
   * @param {{ height?: number, radius?: string, alt?: string }} [opts]
   */
  function renderBanner(email, opts) {
    const url = getBanner(email);
    if (!url) return '';
    opts = opts || {};
    const height = opts.height || 160;
    const radius = opts.radius || '12px';
    const alt = _esc(opts.alt || 'Profile banner');
    return '<img src="' + _esc(url) + '" alt="' + alt + '" ' +
      'style="width:100%;height:' + height + 'px;object-fit:cover;border-radius:' + radius + ';display:block;" ' +
      'onerror="this.style.display=\'none\';" />';
  }

  // ── private helpers ───────────────────────────────────────────────────────

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── public API ────────────────────────────────────────────────────────────

  window.Profile = {
    get: getProfile,
    set: setProfile,
    getAll: getAllProfiles,
    getDisplayName: getDisplayName,
    getPicture: getPicture,
    getBanner: getBanner,
    setAvatarOverride: setAvatarOverride,
    setBanner: setBanner,
    getBadges: getBadges,
    addBadge: addBadge,
    removeBadge: removeBadge,
    saveGoogleProfile: saveGoogleProfile,
    getBadgeDefs: getBadgeDefs,
    saveBadgeDef: saveBadgeDef,
    renderAvatar: renderAvatar,
    renderBadges: renderBadges,
    renderBanner: renderBanner,
    normalizeEmail: normalizeEmail,
  };
}());
