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
 *
 * Firestore structure:
 *   Collection: users
 *   Document ID: Firebase Auth uid
 *   Fields: { email, displayName, picture, updatedAt }
 *
 * Expected Firestore security rules:
 *   match /users/{uid} {
 *     allow read, write: if request.auth != null && request.auth.uid == uid;
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
  const ref  = doc(_db, "users", uid);
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
  const ref  = doc(_db, "users", uid);
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
 */
function _hydrateLocal(email, displayName, picture) {
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

  localStorage.setItem("signedInEmail", email);
  window.signedInEmail = email;

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
  _hydrateLocal(decoded.email, saved.displayName, saved.picture);

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
        remote.picture     || ""
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

  const ref = doc(_db, "users", user.uid);
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

// ── Expose API globally for consumption by non-module scripts ─────────────────
window.FirebaseProfileSync = { signInAndSync, hydrate, signOut, updateDisplayName };

// ── Auto-start hydration on module load ──────────────────────────────────────
// This runs on every page that includes this module script, so any previously
// authenticated Firebase session is re-established and the Profile store is
// populated before the page's UI renders.
hydrate();
