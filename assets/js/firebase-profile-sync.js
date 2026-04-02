/**
 * firebase-profile-sync.js
 *
 * Cross-device profile sync using Firebase Auth + Firestore.
 * Bridges GIS (Google Identity Services) sign-in with Firebase custom-token auth,
 * persists user displayName + picture to Firestore, and hydrates the local
 * window.Profile store so all pages show accurate names/avatars.
 *
 * Usage (from regular <script> tags via window.FirebaseProfileSync):
 *   window.FirebaseProfileSync.signInAndSync(googleCredentialJwt)
 *   window.FirebaseProfileSync.hydrate()
 *   window.FirebaseProfileSync.signOut()
 *   window.FirebaseProfileSync.updateDisplayName(name)
 *   window.FirebaseProfileSync.ensureSignedIn()
 *
 * Firestore structure:
 *   Collection: publicProfiles
 *   Document ID: Firebase Auth uid
 *   Fields: { email, displayName, picture, updatedAt }
 *
 * Expected Firestore security rules (see docs/firestore-rules.md):
 *   match /publicProfiles/{uid} {
 *     allow read: if request.auth != null;
 *     allow create, update: if request.auth != null && request.auth.uid == uid;
 *     allow delete: if false;
 *   }
 *
 * This module is loaded as <script type="module"> and exposes its API via
 * window.FirebaseProfileSync for consumption by non-module scripts.
 * It also dispatches a 'profilesHydrated' CustomEvent on document when the
 * Profile store is updated, so pages can re-render avatars/names.
 */

import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  signInWithCustomToken,
  signOut as fbSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// ── Firebase config (same project used by tasks/calendar) ────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC7k3xdqmsuYOEBBDbDfnrmuaebLaHFWZI",
  authDomain: "tridenttaskboard.firebaseapp.com",
  projectId: "tridenttaskboard",
  storageBucket: "tridenttaskboard.firebasestorage.appspot.com",
  messagingSenderId: "143400263387",
  appId: "1:143400263387:web:66ed521ae75af588e836fe",
  measurementId: "G-F12DDQCX87"
};

// Cloudflare Worker endpoint: exchanges a GIS Google ID token for a Firebase custom token
const WORKER_ENDPOINT = "https://auth-worker.darkshock-dev.workers.dev/firebaseToken";

// Named app so this module never conflicts with other Firebase instances on the same page
const APP_NAME = "trident-profile-sync";

// ── Initialize Firebase (idempotent — safe to load on every page) ─────────────
let _app;
try {
  _app = getApp(APP_NAME);
} catch (_) {
  _app = initializeApp(FIREBASE_CONFIG, APP_NAME);
}

const _auth = getAuth(_app);
const _db   = getFirestore(_app);

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Decode a Google credential JWT using the globally loaded jwt_decode library.
 * @param {string} credentialJwt
 * @returns {{ email: string, name: string, picture: string }|null}
 */
function _decodeGoogle(credentialJwt) {
  if (!credentialJwt) return null;
  if (typeof jwt_decode !== "function") {
    console.warn("[ProfileSync] jwt_decode is not available – cannot decode credential");
    return null;
  }
  try {
    const d = jwt_decode(credentialJwt);
    return {
      email:   (d.email   || "").trim().toLowerCase(),
      name:    d.name    || "",
      picture: d.picture || ""
    };
  } catch (e) {
    console.warn("[ProfileSync] Failed to decode Google credential:", e);
    return null;
  }
}

/**
 * Upsert the user profile document in Firestore.
 *
 * Rules applied:
 * - email and picture are always written from the provided values (Google is source of truth for these).
 * - displayName is only seeded from Google if the user has NOT already set a custom one.
 *   Once a custom name is stored, it is never overwritten by a Google name seed.
 *
 * @param {string} uid
 * @param {{ email: string, name: string, picture: string }} profile
 * @returns {Promise<object>} the merged doc data
 */
async function _upsertProfile(uid, { email, name, picture }) {
  const ref  = doc(_db, "publicProfiles", uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {};

  const updates = {
    email:     email   || existing.email   || null,
    picture:   picture || existing.picture || null,
    updatedAt: serverTimestamp()
  };

  // Seed displayName from Google only if user hasn't chosen one yet.
  if (existing.displayName) {
    // Preserve existing user-chosen name — do not touch it.
    updates.displayName = existing.displayName;
  } else if (name) {
    updates.displayName = name;
  } else {
    updates.displayName = null;
  }

  await setDoc(ref, updates, { merge: true });
  return Object.assign({}, existing, updates);
}

/**
 * Fetch the Firestore profile document for a given Firebase uid.
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
async function _fetchProfile(uid) {
  const ref  = doc(_db, "publicProfiles", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/**
 * Push profile data from Firestore into the local window.Profile store and
 * localStorage, then dispatch the 'profilesHydrated' CustomEvent so pages
 * can re-render any avatar/name elements.
 *
 * @param {string} email
 * @param {string|null} displayName
 * @param {string|null} picture
 * @param {boolean} [isSelf=false] - When true, also updates signedInEmail in localStorage
 */
function _hydrateLocal(email, displayName, picture, isSelf = false) {
  if (!email) return;

  if (typeof window.Profile !== "undefined") {
    // Sync picture (always authoritative from remote)
    if (picture) {
      window.Profile.set(email, { picture });
    }
    // Only overwrite local displayName if remote has a value set
    if (displayName) {
      window.Profile.set(email, { displayName });
    }
  }

  // Only update the "currently signed-in user" markers when hydrating the own profile
  if (isSelf) {
    localStorage.setItem("signedInEmail", email);
    window.signedInEmail = email;
  }

  // Notify pages so they can re-render profile elements
  try {
    document.dispatchEvent(new CustomEvent("profilesHydrated", {
      detail: { email, displayName, picture }
    }));
  } catch (_) {
    // CustomEvent not supported in some very old browsers — safe to ignore
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Exchange a GIS Google ID token for a Firebase custom token via the Cloudflare
 * Worker, sign into Firebase Auth, upsert the Firestore profile, and hydrate the
 * local Profile store.
 *
 * Call this inside handleCredentialResponse() after updating localStorage/UI.
 *
 * @param {string} credentialJwt - response.credential from GIS callback
 * @returns {Promise<{ uid: string, email: string }>}
 */
async function signInAndSync(credentialJwt) {
  const decoded = _decodeGoogle(credentialJwt);
  if (!decoded || !decoded.email) {
    throw new Error("[ProfileSync] No email found in Google credential");
  }

  // Exchange Google ID token → Firebase custom token
  const res = await fetch(WORKER_ENDPOINT, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ googleIdToken: credentialJwt })
  });
  let data = {};
  try {
    data = await res.json();
  } catch (parseErr) {
    console.warn("[ProfileSync] Worker response was not JSON:", parseErr);
  }
  if (!res.ok) {
    throw new Error("[ProfileSync] Worker /firebaseToken error (" + res.status + "): " + (data?.error || "non-JSON response"));
  }

  // Sign into Firebase Auth with the custom token
  const userCred = await signInWithCustomToken(_auth, data.firebaseToken);
  const uid = userCred.user.uid;
  console.log("[ProfileSync] Firebase sign-in OK, uid:", uid);

  // Upsert Firestore profile document
  const saved = await _upsertProfile(uid, decoded);

  // Immediately hydrate local Profile store.
  // _upsertProfile already resolves the correct displayName (preserving user-chosen
  // names and seeding from Google only when none exists), so use saved values directly.
  _hydrateLocal(decoded.email, saved.displayName, saved.picture, true);

  return { uid, email: decoded.email };
}

/**
 * Set up a Firebase Auth state listener. On sign-in (including persisted sessions
 * from a previous visit) fetches the Firestore profile and hydrates the local
 * Profile store so all pages display accurate names/avatars without a page reload.
 *
 * This is called automatically at module load time, so adding
 *   <script type="module" src="/assets/js/firebase-profile-sync.js"></script>
 * to any page is sufficient to enable hydration on that page.
 *
 * @param {Function} [onComplete] - Optional callback invoked after first hydration
 */
function hydrate(onComplete) {
  onAuthStateChanged(_auth, async (user) => {
    if (!user) return;
    try {
      const remote = await _fetchProfile(user.uid);
      if (!remote || !remote.email) return;

      _hydrateLocal(
        remote.email,
        remote.displayName || "",
        remote.picture     || "",
        true
      );
      console.log("[ProfileSync] Hydrated profile for:", remote.email);
      if (typeof onComplete === "function") onComplete(remote);
    } catch (e) {
      console.warn("[ProfileSync] Hydration error:", e);
    }
  });
}

/**
 * Sign out of Firebase Auth.
 * Call alongside GIS sign-out to prevent the next user on the same device from
 * inheriting the previous user's Firestore profile.
 *
 * @returns {Promise<void>}
 */
async function signOut() {
  try {
    await fbSignOut(_auth);
    console.log("[ProfileSync] Firebase signed out");
  } catch (e) {
    console.warn("[ProfileSync] Firebase sign-out failed:", e);
  }
}

/**
 * Update the displayName field in Firestore for the currently signed-in user.
 * Call this when the user saves their chosen display name on the Settings page.
 *
 * The local Profile store is also updated immediately for instant UI feedback.
 *
 * @param {string} displayName - The name the user has chosen (empty string to clear)
 * @returns {Promise<void>}
 */
async function updateDisplayName(displayName) {
  const user = _auth.currentUser;
  if (!user) {
    console.warn("[ProfileSync] updateDisplayName: no signed-in Firebase user");
    return;
  }

  const ref = doc(_db, "publicProfiles", user.uid);
  await setDoc(ref, {
    displayName: displayName || null,
    updatedAt:   serverTimestamp()
  }, { merge: true });
  console.log("[ProfileSync] Saved displayName to Firestore:", displayName);

  // Keep local Profile store in sync
  const email = localStorage.getItem("signedInEmail");
  if (email && typeof window.Profile !== "undefined") {
    window.Profile.set(email, { displayName });
  }
}

/** Timeout (ms) to wait for Firebase Auth state when ensuring sign-in. */
const _ENSURE_SIGNED_IN_TIMEOUT_MS = 5000;

/**
 * Ensure there is a signed-in Firebase user before making write calls.
 *
 * Strategy (in order):
 *  1. Already signed in  → resolve immediately.
 *  2. Stored GIS credential (`g_credential_v1`) exists → re-run signInAndSync.
 *  3. Wait up to 5 s for the onAuthStateChanged listener (set up by hydrate())
 *     to fire with a valid user (handles restored persisted sessions).
 *  4. Still nothing → reject so callers can log a warning without a silent no-op.
 *
 * @returns {Promise<import("firebase/auth").User>}
 */
async function ensureSignedIn() {
  if (_auth.currentUser) return _auth.currentUser;

  // Try re-signing in with the stored GIS credential
  const storedCred = localStorage.getItem('g_credential_v1');
  if (storedCred) {
    try {
      await signInAndSync(storedCred);
      if (_auth.currentUser) return _auth.currentUser;
    } catch (e) {
      console.warn('[ProfileSync] ensureSignedIn: re-sign-in attempt failed:', e);
    }
  }

  // Wait for the existing onAuthStateChanged listener to fire (persisted session).
  // `unsub` is assigned synchronously before the timer callback can fire, so it
  // is always defined by the time it is called.
  return new Promise((resolve, reject) => {
    let unsub;
    const timer = setTimeout(() => {
      unsub();
      reject(new Error('[ProfileSync] ensureSignedIn: timed out waiting for auth state'));
    }, _ENSURE_SIGNED_IN_TIMEOUT_MS);
    unsub = onAuthStateChanged(_auth, (user) => {
      if (user) {
        clearTimeout(timer);
        unsub();
        resolve(user);
      }
    });
  });
}




/**
 * In-memory cache for resolved profiles: email -> { displayName, picture, cachedAt }
 * Complements the localStorage layer to avoid redundant Firestore reads within a session.
 * @type {Map<string, {displayName: string|null, picture: string|null, cachedAt: number}>}
 */
const _resolveCache = new Map();
const _RESOLVE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Given an array of email addresses, resolve each one to a { displayName, picture }
 * from the shared `publicProfiles` Firestore collection, then seed the local
 * window.Profile store so avatars/names render correctly on the task board.
 *
 * Results are cached in memory (for the current page session) and in localStorage
 * (across page loads, with a 5-minute TTL) to minimise Firestore reads.
 *
 * Only emails that are not already cached are queried from Firestore.
 * The function is safe to call even when the user is not yet Firebase-authenticated;
 * it will skip Firestore queries and resolve from cache only.
 *
 * @param {string[]} emails - normalised email addresses to resolve
 * @returns {Promise<void>}
 */
async function resolveProfiles(emails) {
  if (!Array.isArray(emails) || emails.length === 0) return;

  const now = Date.now();
  const uncached = [];

  for (const raw of emails) {
    const email = (raw || "").trim().toLowerCase();
    if (!email) continue;

    // 1) In-memory cache
    const mem = _resolveCache.get(email);
    if (mem && (now - mem.cachedAt) < _RESOLVE_CACHE_TTL) continue;

    // 2) localStorage cache
    const lsKey = "trident.profileCache." + email;
    try {
      const lsRaw = localStorage.getItem(lsKey);
      if (lsRaw) {
        const lsData = JSON.parse(lsRaw);
        if (lsData.cachedAt && (now - lsData.cachedAt) < _RESOLVE_CACHE_TTL) {
          // Warm in-memory cache and hydrate Profile store from localStorage entry
          _resolveCache.set(email, lsData);
          const isSelf = email === (localStorage.getItem("signedInEmail") || "").trim().toLowerCase();
          _hydrateLocal(email, lsData.displayName, lsData.picture, isSelf);
          continue;
        }
      }
    } catch (_) {
      // Ignore malformed cache entries
    }

    uncached.push(email);
  }

  if (uncached.length === 0) return;

  // Require Firebase Auth to query Firestore (rules: read if signed in)
  if (!_auth.currentUser) {
    console.warn("[ProfileSync] resolveProfiles: not signed into Firebase; skipping Firestore lookup for", uncached);
    return;
  }

  // Query publicProfiles in batches of 30 (Firestore `in` operator limit)
  try {
    for (let i = 0; i < uncached.length; i += 30) {
      const batch = uncached.slice(i, i + 30);
      const q = query(
        collection(_db, "publicProfiles"),
        where("email", "in", batch)
      );
      const snap = await getDocs(q);
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const em = (data.email || "").trim().toLowerCase();
        if (!em) return;

        const entry = {
          displayName: data.displayName || null,
          picture:     data.picture     || null,
          cachedAt:    Date.now()
        };

        // Update caches
        _resolveCache.set(em, entry);
        try {
          localStorage.setItem("trident.profileCache." + em, JSON.stringify(entry));
        } catch (_) {}

        // Seed the local Profile store → triggers UI update
        const isSelf = em === (localStorage.getItem("signedInEmail") || "").trim().toLowerCase();
        _hydrateLocal(em, entry.displayName, entry.picture, isSelf);
      });
    }
  } catch (e) {
    console.warn("[ProfileSync] resolveProfiles Firestore error:", e);
  }
}

// ── Expose API globally for consumption by non-module scripts ─────────────────
window.FirebaseProfileSync = { signInAndSync, hydrate, signOut, updateDisplayName, resolveProfiles, ensureSignedIn };

// ── Auto-start hydration on module load ──────────────────────────────────────
// This runs on every page that includes this module script, so any previously
// authenticated Firebase session is re-established and the Profile store is
// populated before the page's UI renders.
hydrate();
