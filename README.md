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