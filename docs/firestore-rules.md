# Firestore Security Rules

This document describes the recommended Firestore security rules for the
`tridenttaskboard` Firebase project used by the task board, calendar, and
cross-device profile sync features.

> **Important:** These rules must be applied manually in the
> [Firebase Console](https://console.firebase.google.com/) under
> **Firestore Database → Rules**. They are not deployed automatically.

---

## Recommended rule set

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Public profile directory ───────────────────────────────────────────
    // Each signed-in user writes their own profile (displayName, picture, email).
    // Any signed-in user can read all profiles so the task board can display
    // accurate names and avatars for other team members.
    match /publicProfiles/{uid} {
      allow read:   if request.auth != null;
      allow create, update: if request.auth != null && request.auth.uid == uid;
      allow delete: if false;
    }

    // ── Tasks ─────────────────────────────────────────────────────────────
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }

    // ── Calendar events ───────────────────────────────────────────────────
    match /events/{eventId} {
      allow read, write: if request.auth != null;
    }

    // ── Build Season Timeline ─────────────────────────────────────────────
    // The timeline is a single shared document (timeline/buildSeasonGantt).
    // Public read is intentional — the page is accessible without sign-in.
    // Writes are also open so any team member can edit without signing in.
    // If you want to restrict writes to signed-in users only, change the
    // write rule to:  allow write: if request.auth != null;
    match /timeline/{docId} {
      allow read:  if true;
      allow write: if true;
    }

    // ── Deny everything else by default ───────────────────────────────────
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Why `publicProfiles`?

The profile directory uses a **separate, team-readable collection** (`publicProfiles`)
instead of a private per-user collection so that:

- Account A can read Account B's `displayName` and `picture` when rendering
  the task board, calendar, or any other page showing team members.
- Each user can only **write their own document** (enforced by
  `request.auth.uid == uid`), preventing one user from overwriting another's profile.
- Deletes are disabled to prevent accidental data loss.

## Fields stored in `publicProfiles/{uid}`

| Field         | Type      | Description                                      |
|---------------|-----------|--------------------------------------------------|
| `email`       | string    | Google account email (lowercase, trimmed)        |
| `displayName` | string    | User's chosen display name (opt-in from Settings)|
| `picture`     | string    | Google profile photo URL                         |
| `updatedAt`   | timestamp | Server timestamp of last write                   |

## How profiles are written

1. **On GIS sign-in** (`index.html`, `sponsors/index.html`): the
   `firebase-profile-sync.js` module exchanges the Google ID token for a
   Firebase custom token via the Cloudflare Worker, signs into Firebase Auth,
   and upserts `publicProfiles/{uid}` with the Google email, name, and picture.

2. **On Settings display-name save** (`settings/index.html`): when the user
   chooses a custom display name and saves it, `FirebaseProfileSync.updateDisplayName()`
   updates the `displayName` field in their `publicProfiles/{uid}` document.

## How profiles are read (task board)

`tasks/index.html` calls `FirebaseProfileSync.resolveProfiles(emails)` after
loading tasks. The function queries `publicProfiles` for any emails not already
in the local (in-memory + localStorage) cache and seeds `window.Profile` so
avatars and names render correctly. Results are cached for 5 minutes to reduce
Firestore reads.

---

## Build Season Timeline sync (`timeline/buildSeasonGantt`)

The timeline stores a single JSON snapshot in:

```
collection: timeline
document:   buildSeasonGantt
fields:
  state.season      – { start, end } ISO date strings
  state.zoom        – "full" | "8w" | "4w" | "2w"
  state.subteams    – array of { id, name, color, start, end }
  state.nextId      – next auto-increment ID to prevent collisions
  updatedAt         – server timestamp set on every write
```

The `timeline-sync.js` module:
1. Fetches the document on page load and applies it via `window.Timeline.applyRemoteState()`.
2. Keeps an `onSnapshot` real-time listener so edits by other clients appear
   within ~1 s on all open tabs / devices.
3. Debounces writes by 800 ms to avoid excess Firestore operations during
   rapid drag-resize interactions.
4. Falls back to localStorage when Firestore is unreachable (offline mode).

### Restricting timeline writes to authenticated users

By default the rule above allows anyone to write.  To restrict edits to
signed-in team members, change the `timeline` match block to:

```
match /timeline/{docId} {
  allow read:  if true;
  allow write: if request.auth != null;
}
```

You will also need to ensure users sign in via `firebase-profile-sync.js`
before any timeline saves are attempted.  If a save is attempted while the user
is not signed in, `timeline-sync.js` will catch the Firestore permission error
and display **"Sync error"** in the status indicator; the change will still be
saved to `localStorage` so no data is lost.  You may want to show a sign-in
prompt at that point by listening for the `'Sync error'` status or by wrapping
the `scheduleSave` call with an auth check.

