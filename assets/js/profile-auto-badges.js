/**
 * profile-auto-badges.js
 *
 * Enforces system-managed, non-removable role badges for users who are listed in
 * the canonical allowlists (developers.json / team-members.json).
 *
 * Badge definitions are loaded from assets/data/role-badges.json so the
 * Developer page can update them centrally.
 *
 * Exposes: window.ProfileAutoBadges
 *   .enforceRoleBadges(email)     → Promise<boolean>  (true if badges were added)
 *   .isSystemBadge(badgeId, email)→ boolean  (sync, for UI locking)
 *   .getSystemBadgeIds()          → string[] (badge IDs that are system-managed)
 *   .getRoleBadgeDefs()           → Promise<{developerBadge, teamMemberBadge}|null>
 */
(function () {
  'use strict';

  // ── Cache ──────────────────────────────────────────────────────────────────

  var _roleBadgeDefs = null;          // cached parsed role-badges.json
  var _roleBadgeDefsPromise = null;   // in-flight fetch promise

  /**
   * Fetch and cache the role-badge definitions from role-badges.json.
   * Returns a default if the file cannot be fetched.
   */
  function getRoleBadgeDefs() {
    if (_roleBadgeDefs) return Promise.resolve(_roleBadgeDefs);
    if (_roleBadgeDefsPromise) return _roleBadgeDefsPromise;

    _roleBadgeDefsPromise = fetch('/assets/data/role-badges.json?v=' + Math.floor(Date.now() / 300000))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.developerBadge && data.teamMemberBadge) {
          _roleBadgeDefs = data;
        } else {
          // Fallback to built-in defaults
          _roleBadgeDefs = {
            developerBadge:  { id: 'developer',   name: 'Developer',    emoji: '💻', color: '#6366f1' },
            teamMemberBadge: { id: 'team-member',  name: 'Team Member',  emoji: '🛡️', color: '#0ea5e9' }
          };
        }
        return _roleBadgeDefs;
      })
      .catch(function () {
        _roleBadgeDefs = {
          developerBadge:  { id: 'developer',   name: 'Developer',    emoji: '💻', color: '#6366f1' },
          teamMemberBadge: { id: 'team-member',  name: 'Team Member',  emoji: '🛡️', color: '#0ea5e9' }
        };
        return _roleBadgeDefs;
      });

    return _roleBadgeDefsPromise;
  }

  /**
   * Invalidate the in-memory role-badge defs cache (call after pushing new
   * definitions to GitHub).
   */
  function invalidateRoleBadgeDefsCache() {
    _roleBadgeDefs = null;
    _roleBadgeDefsPromise = null;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Normalise an email address.
   * @param {string} email
   * @returns {string}
   */
  function _normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
  }

  /**
   * True when Profile is available.
   */
  function _hasProfile() {
    return typeof window.Profile !== 'undefined';
  }

  /**
   * True when auth-utils isDeveloper / isTeamMember are available.
   */
  function _hasAuthUtils() {
    return typeof isDeveloper === 'function' && typeof isTeamMember === 'function';
  }

  // ── Core enforcement ───────────────────────────────────────────────────────

  /**
   * Ensure all system-managed role badges are present for the given email.
   * Writes only to the local window.Profile store; the caller is responsible
   * for persisting to Firestore if needed.
   *
   * @param {string} email
   * @returns {Promise<boolean>} – true if any badge was added
   */
  async function enforceRoleBadges(email) {
    if (!email || !_hasProfile()) return false;

    const em = _normalizeEmail(email);
    let added = false;

    try {
      const defs = await getRoleBadgeDefs();

      // ── Developer badge ───────────────────────────────────────────────────
      const shouldHaveDev = _hasAuthUtils()
        ? isDeveloper(em)
        : false;

      if (shouldHaveDev) {
        const devBadge = defs.developerBadge;
        const existing = window.Profile.getBadges(em);
        if (!existing.some(function (b) { return b.id === devBadge.id; })) {
          window.Profile.addBadge(em, devBadge);
          added = true;
          console.log('[AutoBadge] Added developer badge for', em);
        }
      }

      // ── Team Member badge ─────────────────────────────────────────────────
      const shouldHaveTeam = _hasAuthUtils()
        ? isTeamMember(em)
        : false;

      if (shouldHaveTeam) {
        const teamBadge = defs.teamMemberBadge;
        const existing = window.Profile.getBadges(em);
        if (!existing.some(function (b) { return b.id === teamBadge.id; })) {
          window.Profile.addBadge(em, teamBadge);
          added = true;
          console.log('[AutoBadge] Added team-member badge for', em);
        }
      }
    } catch (e) {
      console.warn('[AutoBadge] enforceRoleBadges error:', e);
    }

    return added;
  }

  /**
   * Synchronously check whether a badge ID is system-managed for the given email
   * (uses the sync allowlist checks from auth-utils).
   *
   * @param {string} badgeId
   * @param {string} email
   * @returns {boolean}
   */
  function isSystemBadge(badgeId, email) {
    if (!badgeId || !email) return false;
    const em = _normalizeEmail(email);

    if (badgeId === 'developer' && _hasAuthUtils() && isDeveloper(em)) return true;
    if (badgeId === 'team-member' && _hasAuthUtils() && isTeamMember(em)) return true;
    return false;
  }

  /**
   * Returns the badge IDs that are managed by the system (always present for
   * qualifying users and cannot be manually removed).
   * @returns {string[]}
   */
  function getSystemBadgeIds() {
    return ['developer', 'team-member'];
  }

  // ── Public API ────────────────────────────────────────────────────────────

  window.ProfileAutoBadges = {
    enforceRoleBadges: enforceRoleBadges,
    isSystemBadge: isSystemBadge,
    getSystemBadgeIds: getSystemBadgeIds,
    getRoleBadgeDefs: getRoleBadgeDefs,
    invalidateRoleBadgeDefsCache: invalidateRoleBadgeDefsCache
  };
}());
