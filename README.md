# DarkShockGamer.github.io

Source for the GitHub Pages site hosted at https://darkshockgamer.github.io.

## What this repo is
This repository is a **static website** (HTML/CSS/JavaScript) deployed with **GitHub Pages**.

The site content (team info, sponsors, timeline, etc.) is primarily driven by `data/site.json`.

> Language breakdown (from GitHub): **HTML 70.9% · JavaScript 21.5% · CSS 7.6%**

## Site sections (folders)
These folders map to pages on the live site:

- `developer/` — Developer console / editor (restricted)
- `tasks/` — Task board (restricted)
- `ui-lab/` — UI lab / experimentation page (restricted)
- `telemetry/` — Telemetry / monitoring page (restricted)
- `settings/` — Site settings (theme, accessibility, etc.)
- `timeline/` — Timeline page
- `sponsors/` — Sponsors page
- `faq/` — FAQ page
- `links/` — Links page
- `calendar/` — Calendar page

## Data files
- `data/site.json` — Main site content (title, about, timeline entries, leadership, media, sponsors)
- `assets/data/developers.json` — List of developer accounts
- `assets/data/team-members.json` — Allowlist used for restricted pages

## Restricted pages / access control
Some parts of the site are protected by **client-side** access checks (intended to prevent accidental access, not to provide strong security).

Protected areas include:

- `/developer/`
- `/tasks/`
- `/ui-lab/`
- `/telemetry/`

Access is handled by:

- `assets/js/auth-guard.js` (shared guard)
- `assets/js/auth-guard-developer.js` (developer-specific guard)
- `assets/js/auth-config.js` (allowed emails / configuration)

Unauthorized users are routed to `restricted.html`.

## Cross-device profile sync
The site includes optional profile syncing for signed-in users using Firebase Auth + Firestore.

Main module:
- `assets/js/firebase-profile-sync.js`

## Build Season Timeline auto-sync
The [Build Season Timeline](/timeline/) uses **Firebase Firestore** to keep the
Gantt chart in sync across all devices and users automatically.

### How it works
- On page load the latest state is fetched from Firestore and rendered.
- An `onSnapshot` real-time listener keeps all open tabs / devices in sync
  without requiring a page reload (~1 s update latency).
- Every local change is debounced (800 ms) then written to Firestore.
- `localStorage` is updated on every save and used as an offline fallback when
  Firestore is unreachable.
- A small status indicator (Syncing… / Synced ✓ / Offline (cached) / Sync error)
  appears next to the action buttons.

### Firebase project
The timeline uses the same Firebase project as the task board and calendar:
`tridenttaskboard` (Project ID).  No additional Firebase project is needed.

### Required Firestore rules
You **must** add the `timeline` collection to the Firestore security rules.
Open the [Firebase Console](https://console.firebase.google.com/) →
**Firestore Database → Rules** and add:

```
match /timeline/{docId} {
  allow read:  if true;
  allow write: if true;
}
```

See [`docs/firestore-rules.md`](docs/firestore-rules.md) for the full
recommended rule set and guidance on restricting writes to authenticated users.

### Firestore data structure
```
collection: timeline
document:   buildSeasonGantt
fields:
  state.season      – { start, end } ISO date strings
  state.zoom        – "full" | "8w" | "4w" | "2w"
  state.subteams    – array of { id, name, color, start, end }
  state.nextId      – next auto-increment ID counter
  updatedAt         – server timestamp
```

## Local development
Because some pages fetch JSON, you should run a local server (not `file://`).

```sh
# from the repo root
python3 -m http.server 8080
# then open
# http://localhost:8080
```

## Contributing
- Small edits: use the GitHub web editor.
- Larger changes: create a branch and open a PR.

## License
No license file is currently present in this repository. Add a `LICENSE` file if you want to explicitly define usage terms.