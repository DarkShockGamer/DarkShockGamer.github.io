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

    // ── Timeline (shared, team-editable) ─────────────────────────────────────
    // Single shared document storing the Build Season Gantt state.
    // Two options:
    //   (a) Require authentication (recommended if all editors are signed in):
    //         allow read, write: if request.auth != null;
    //   (b) Fully public (any visitor can read/write – suitable when the page
    //       is used without sign-in):
    //         allow read, write: if true;
    // Default to option (a) for stronger security.
    match /sharedState/timeline {
      allow read, write: if request.auth != null;
    }

    // ── Tasks ─────────────────────────────────────────────────────────────
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }

    // ── Calendar events ───────────────────────────────────────────────────
    match /events/{eventId} {
      allow read, write: if request.auth != null;
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
