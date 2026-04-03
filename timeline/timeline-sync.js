/**
 * timeline-sync.js
 *
 * Firebase Firestore auto-sync for the Build Season Timeline.
 * Loaded as <script type="module"> so it is always deferred; timeline.js
 * (a classic blocking script) has already run and set window.Timeline by
 * the time this module executes, which is exactly what we need.
 *
 * Behaviour:
 *  1. On load – fetch latest Firestore state; push it into window.Timeline
 *     via applyRemoteState(). Falls back to localStorage if offline.
 *  2. Real-time – onSnapshot listener re-applies state whenever any client
 *     saves, so other tabs / devices update within ~1 s without reload.
 *  3. On change – timeline.js calls window.TimelineSync.save(state) after
 *     every local mutation; writes are debounced (800 ms) to Firestore and
 *     also cached in localStorage as an offline fallback.
 *  4. Status – updates the #saveStatus element shared with timeline.js.
 *
 * Firestore document: timeline/buildSeasonGantt
 * Fields: { state: <TimelineState>, updatedAt: Timestamp }
 *
 * Security rules (add to Firestore → Rules in Firebase Console):
 *   match /timeline/{docId} {
 *     allow read:  if true;          // public read
 *     allow write: if true;          // public write (team tool)
 *   }
 * See docs/firestore-rules.md for the full recommended rule set with
 * authentication-gated writes.
 */

import { initializeApp, getApps }
  from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// ── Firebase config (same project used by tasks / calendar / profile-sync) ───
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyC7k3xdqmsuYOEBBDbDfnrmuaebLaHFWZI',
  authDomain:        'tridenttaskboard.firebaseapp.com',
  projectId:         'tridenttaskboard',
  storageBucket:     'tridenttaskboard.firebasestorage.appspot.com',
  messagingSenderId: '143400263387',
  appId:             '1:143400263387:web:66ed521ae75af588e836fe',
  measurementId:     'G-F12DDQCX87',
};

// Named app so this module never conflicts with other Firebase instances.
const APP_NAME        = 'trident-timeline-sync';
const COLLECTION      = 'timeline';
const DOC_ID          = 'buildSeasonGantt';
const LOCAL_CACHE_KEY = 'timeline-gantt-v2'; // shared with timeline.js
const DEBOUNCE_MS     = 800;

// ── Firebase initialisation (idempotent) ─────────────────────────────────────
const app = getApps().find(a => a.name === APP_NAME) || initializeApp(FIREBASE_CONFIG, APP_NAME);
const db  = getFirestore(app);
const ref = doc(db, COLLECTION, DOC_ID);

// ── Status element helper ─────────────────────────────────────────────────────
/**
 * Update the shared #saveStatus element.
 * @param {string} msg
 * @param {'info'|'warn'|'error'} [type]
 */
function setStatus(msg, type = 'info') {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.color = type === 'error' ? '#ef4444'
                 : type === 'warn'  ? '#f59e0b'
                 :                    '#10b981';
  clearTimeout(setStatus._t);
  // Auto-clear success/info messages; leave warn/error until next update.
  if (type === 'info') {
    setStatus._t = setTimeout(() => { el.textContent = ''; }, 3000);
  }
}

// ── Remote-state application ──────────────────────────────────────────────────
/**
 * Push a Firestore-sourced state snapshot into the Timeline IIFE via its
 * public API.  Also caches to localStorage so the page loads quickly on the
 * next visit even when offline.
 */
function applyRemote(remoteState) {
  if (!remoteState || typeof remoteState !== 'object') return;
  // Keep local cache up-to-date for offline fallback.
  try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(remoteState)); } catch (_) {}
  // Push into running Timeline (available because timeline.js already ran).
  window.Timeline?.applyRemoteState(remoteState);
}

// ── Debounced Firestore write ─────────────────────────────────────────────────
let _saveTimer       = null;
/** Set true just before we write so our own onSnapshot echo is ignored. */
let _suppressNext    = false;

/**
 * Schedule a debounced write to Firestore.
 * Strips UI-only fields (selectedId) before persisting.
 * @param {object} stateSnapshot - full state from timeline.js
 */
function scheduleSave(stateSnapshot) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    // Strip UI-only field that has no meaning for other clients.
    const { selectedId: _ignored, ...persistable } = stateSnapshot;
    setStatus('Saving…', 'warn');
    _suppressNext = true;
    setDoc(ref, { state: persistable, updatedAt: serverTimestamp() }, { merge: false })
      .then(()  => setStatus('Synced ✓'))
      .catch(err => {
        console.error('[TimelineSync] Save error:', err);
        _suppressNext = false;
        setStatus('Sync error', 'error');
      });
  }, DEBOUNCE_MS);
}

// ── Bootstrap: initial load + real-time listener ─────────────────────────────
(function bootstrap() {
  setStatus('Syncing…', 'warn');

  getDoc(ref)
    .then(snap => {
      if (snap.exists()) {
        applyRemote(snap.data().state);
        setStatus('Synced ✓');
      } else {
        // No remote document yet — seed Firestore from the current local state.
        setStatus('Initialising remote…', 'warn');
        try {
          const raw = localStorage.getItem(LOCAL_CACHE_KEY);
          if (raw) scheduleSave(JSON.parse(raw));
        } catch (_) {}
      }

      // Real-time listener for updates from other clients.
      onSnapshot(ref, snapshot => {
        if (_suppressNext) { _suppressNext = false; return; }
        if (snapshot.exists()) {
          applyRemote(snapshot.data().state);
        }
      }, err => {
        console.warn('[TimelineSync] Listener error:', err);
        setStatus('Offline (cached)', 'warn');
      });
    })
    .catch(err => {
      console.warn('[TimelineSync] Load error:', err);
      setStatus('Offline (cached)', 'warn');
    });
})();

// ── Public API (consumed by timeline.js) ─────────────────────────────────────
window.TimelineSync = {
  /** Debounced save to Firestore; called by timeline.js after every mutation. */
  save:      scheduleSave,
  /** Expose status helper so timeline.js can route its own messages through it. */
  setStatus,
};
