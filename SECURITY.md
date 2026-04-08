# Security Policy

## Reporting a Vulnerability

If you discover a security issue in this site, please open a GitHub Issue or contact the maintainers directly.

---

## What Was Changed (Security Hardening)

### 1. XSS Hardening — "DOM text reinterpreted as HTML"

Several places previously interpolated data-source strings directly into `innerHTML`, which scanners flag as potential cross-site scripting (XSS) sinks.

| File | Change |
|---|---|
| `sponsors/index.html` | Added `esc()` (HTML-encode) and `safeUrl()` (URL-allowlist) helpers; all sponsor name/url/logo values are escaped before being written into `innerHTML`. |
| `ui-lab/pages/03-feedback.html` | Command-palette empty-state now builds the "no results" message with `createElement`/`textContent` instead of `innerHTML + filter`. |
| `assets/js/site-data-injector.js` | Timeline date/title and team-member names now use `textContent` instead of `innerHTML`. |

### 2. Firebase Config Consolidation — "Secrets Exposed in Code"

The Firebase `apiKey` appeared in three separate files. It has been consolidated into a single source of truth:

- **`assets/js/firebase-config.js`** — shared config file imported by all Firebase consumers.
- `assets/js/firebase-profile-sync.js`, `tasks/index.html`, `calendar/index.html` — now import from the shared file.

#### Is the Firebase `apiKey` a secret?

**No.** The Firebase `apiKey` is a *public project identifier*, not a credential. It is safe and expected to be shipped in client-side JavaScript. Access control is enforced server-side by [Firestore security rules](docs/firestore-rules.md) (e.g., only authenticated users can read/write `publicProfiles`).

See Google's own guidance: https://firebase.google.com/docs/projects/api-keys

### 3. Hardcoded Team Email Addresses

`assets/js/auth-utils.js` contains `HARDCODED_DEVELOPERS` and `HARDCODED_TEAM_MEMBERS` — these are **configuration values**, not secrets. They are email addresses that control portal/developer access and are intentionally visible in this public repository.

### 4. Cloudflare Worker Endpoint

The `WORKER_ENDPOINT` URL in `assets/js/firebase-profile-sync.js` is a **public, unauthenticated endpoint** that accepts a Google ID token and returns a Firebase custom token. It does not embed any secret API key or bearer token.

---

## How to Rotate Credentials

### If the Firebase project is compromised:
1. Go to the [Firebase console](https://console.firebase.google.com/) → Project Settings.
2. Under **General**, regenerate the Web API key.
3. Update `assets/js/firebase-config.js` with the new `apiKey`.
4. Review and tighten [Firestore security rules](https://console.firebase.google.com/project/_/firestore/rules).
5. Revoke all existing Firebase Auth tokens if needed (Settings → Service Accounts).

### If the Cloudflare Worker is compromised:
1. Rotate any secrets stored in the Cloudflare Worker environment variables.
2. The Worker endpoint URL itself is not a secret and does not need to change.

### If a GitHub Personal Access Token was accidentally committed:
1. Immediately go to GitHub → Settings → Developer settings → Personal access tokens.
2. Revoke the exposed token.
3. Generate a new token and store it in GitHub Secrets, **never** in source code.

---

## What Is Safe to Publish

| Item | Safe to publish? | Notes |
|---|---|---|
| Firebase `apiKey` | ✅ Yes | Public project identifier; Firestore rules enforce access. |
| Firebase `projectId`, `appId`, etc. | ✅ Yes | Public identifiers. |
| Cloudflare Worker URL | ✅ Yes | Public endpoint; secrets live in Worker environment. |
| Team email allowlist | ✅ Yes | Config, not credentials. |
| GitHub PAT / OAuth token | ❌ No | Rotate immediately if leaked. |
| Firebase Service Account JSON | ❌ No | Server-side only; never commit. |
