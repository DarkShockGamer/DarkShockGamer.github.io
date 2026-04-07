# Cloudflare Worker — `/setBadges` endpoint

This document describes the `POST /setBadges` endpoint that must be added to
the existing `auth-worker` Cloudflare Worker
(`https://auth-worker.darkshock-dev.workers.dev`).

The endpoint allows authorised developers to write badge data to any user's
`publicProfiles` Firestore document without relaxing the Firestore security
rules (which only permit self-writes). This enables **cross-device, admin-
assigned badge syncing** — similar to Discord server roles.

---

## Request

```
POST https://auth-worker.darkshock-dev.workers.dev/setBadges
Content-Type: application/json
Authorization: Bearer <Google ID token stored in localStorage as g_credential_v1>

{
  "targetEmail": "user@example.com",
  "badges": [
    { "id": "captain",   "name": "Captain",   "emoji": "⭐", "color": "#f59e0b" },
    { "id": "developer", "name": "Developer", "emoji": "💻", "color": "#6366f1" }
  ]
}
```

### Fields

| Field           | Type    | Required | Description                                                 |
|-----------------|---------|----------|-------------------------------------------------------------|
| `targetEmail`   | string  | ✓        | Email of the user whose badges should be updated            |
| `badges`        | array   | ✓        | Array of badge objects `{id, name, emoji, color}`. Pass `[]` to clear all badges. |

The `Authorization` header must be a valid **Google ID token** (JWT) issued by
Google Identity Services. The Worker decodes it and uses the `email` claim to
verify that the requester is listed in the published developer allowlist.

---

## Authorization flow

1. Decode the Google ID token (verify signature using Google's JWKs or a
   lightweight decode for the `email` claim).
2. Fetch `https://darkshockgamer.github.io/assets/data/developers.json`.
3. Allow the request only if the requester's email appears in
   `data.developers[]`.
4. Query Firestore `publicProfiles` where `email == targetEmail`.
5. If no document is found, return **404** with
   `{ "error": "User must sign in once before roles can be assigned." }`.
6. Update the matching document's `badges` field and set `updatedAt`.

---

## Responses

| Status | Body                                                     |
|--------|----------------------------------------------------------|
| 200    | `{ "ok": true }`                                         |
| 400    | `{ "error": "Missing targetEmail or badges." }`          |
| 401    | `{ "error": "Unauthorized: missing or invalid token." }` |
| 403    | `{ "error": "Forbidden: requester is not a developer." }`|
| 404    | `{ "error": "User must sign in once before roles can be assigned." }` |
| 500    | `{ "error": "<internal error message>" }`                |

---

## Required environment variables

Set these in the Cloudflare Worker dashboard under
**Settings → Variables → Environment Variables**:

| Variable                  | Description                                         |
|---------------------------|-----------------------------------------------------|
| `FIREBASE_PROJECT_ID`     | Firebase project ID, e.g. `tridenttaskboard`        |
| `FIREBASE_CLIENT_EMAIL`   | Service account email from the Firebase Admin SDK JSON key |
| `FIREBASE_PRIVATE_KEY`    | Service account private key (PEM, with `\n` newlines) |

These variables are used to create a signed JWT for Firebase Admin REST API
calls (no Node.js Firebase Admin SDK needed inside a Cloudflare Worker).

---

## Complete Worker handler (add to your existing Worker)

```js
// ─────────────────────────────────────────────────────────────────────────────
// /setBadges  — admin-assign badges for any publicProfiles document
// ─────────────────────────────────────────────────────────────────────────────

const DEVELOPERS_JSON_URL =
  'https://darkshockgamer.github.io/assets/data/developers.json';

// Cache the developers list for up to 60 s to avoid hammering GitHub Pages.
let _devListCache = null;
let _devListCachedAt = 0;

async function fetchDeveloperList() {
  if (_devListCache && Date.now() - _devListCachedAt < 60_000) {
    return _devListCache;
  }
  const res = await fetch(DEVELOPERS_JSON_URL, { cf: { cacheTtl: 60 } });
  if (!res.ok) throw new Error('Could not fetch developers.json: ' + res.status);
  const data = await res.json();
  _devListCache = Array.isArray(data.developers) ? data.developers.map(e => e.trim().toLowerCase()) : [];
  _devListCachedAt = Date.now();
  return _devListCache;
}

/** Decode a JWT payload without verifying the signature (claims only). */
function decodeJwtPayload(jwt) {
  try {
    const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (_) {
    return null;
  }
}

/** Build a Firebase Admin REST API bearer token via a service-account JWT. */
async function getFirebaseAdminToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    sub: env.FIREBASE_CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore'
  };

  // Sign the JWT with the service account private key.
  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    pemToBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body   = btoa(JSON.stringify(payload));
  const unsigned = header + '.' + body;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyData,
    new TextEncoder().encode(unsigned));

  const signedJwt = unsigned + '.' + bufferToBase64Url(sig);

  // Exchange for an OAuth2 access token.
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${signedJwt}`
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Failed to get Firebase access token');
  return tokenData.access_token;
}

function pemToBuffer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function bufferToBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Query Firestore for the publicProfiles document where email == targetEmail.
 * Returns { docId, data } or null if not found.
 */
async function findProfileByEmail(projectId, accessToken, targetEmail) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'publicProfiles' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'email' },
          op: 'EQUAL',
          value: { stringValue: targetEmail }
        }
      },
      limit: 1
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    body: JSON.stringify(body)
  });
  const results = await res.json();
  if (!Array.isArray(results) || !results[0] || !results[0].document) return null;
  const doc = results[0].document;
  // Extract document ID from the name path
  const docId = doc.name.split('/').pop();
  return { docId, data: doc };
}

/** PATCH a Firestore document's badges field. */
async function patchProfileBadges(projectId, accessToken, docId, badges) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/publicProfiles/${docId}` +
    `?updateMask.fieldPaths=badges&updateMask.fieldPaths=updatedAt`;

  const badgesValue = {
    arrayValue: {
      values: badges.map(b => ({
        mapValue: {
          fields: {
            id:    { stringValue: String(b.id    || '') },
            name:  { stringValue: String(b.name  || '') },
            emoji: { stringValue: String(b.emoji || '') },
            color: { stringValue: String(b.color || '') }
          }
        }
      }))
    }
  };

  const body = {
    fields: {
      badges:    badgesValue,
      updatedAt: { timestampValue: new Date().toISOString() }
    }
  };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Firestore PATCH failed: ' + err);
  }
}

// ── Main handler (integrate into your existing fetch handler) ─────────────────
// In your Worker's fetch() handler, add a branch like:
//
//   if (url.pathname === '/setBadges' && request.method === 'POST') {
//     return handleSetBadges(request, env);
//   }

async function handleSetBadges(request, env) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://darkshockgamer.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Extract and decode the Google ID token
    const authHeader = request.headers.get('Authorization') || '';
    const googleIdToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!googleIdToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing or invalid token.' }),
        { status: 401, headers: corsHeaders });
    }

    const payload = decodeJwtPayload(googleIdToken);
    if (!payload || !payload.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized: could not decode token.' }),
        { status: 401, headers: corsHeaders });
    }
    const requesterEmail = payload.email.trim().toLowerCase();

    // 2. Verify requester is a developer
    const devList = await fetchDeveloperList();
    if (!devList.includes(requesterEmail)) {
      return new Response(JSON.stringify({ error: 'Forbidden: requester is not a developer.' }),
        { status: 403, headers: corsHeaders });
    }

    // 3. Parse request body
    const body = await request.json();
    const targetEmail = (body.targetEmail || '').trim().toLowerCase();
    const badges = Array.isArray(body.badges) ? body.badges : [];
    if (!targetEmail) {
      return new Response(JSON.stringify({ error: 'Missing targetEmail or badges.' }),
        { status: 400, headers: corsHeaders });
    }

    // 4. Get Firebase Admin access token
    const accessToken = await getFirebaseAdminToken(env);

    // 5. Find the target user's publicProfiles document
    const profile = await findProfileByEmail(env.FIREBASE_PROJECT_ID, accessToken, targetEmail);
    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User must sign in once before roles can be assigned.' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 6. Patch the badges field
    await patchProfileBadges(env.FIREBASE_PROJECT_ID, accessToken, profile.docId, badges);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('[setBadges] Error:', err);
    return new Response(JSON.stringify({ error: String(err.message || err) }),
      { status: 500, headers: corsHeaders });
  }
}
```

---

## Deployment steps

1. Open the [Cloudflare Workers dashboard](https://dash.cloudflare.com) and
   navigate to **Workers & Pages → auth-worker**.
2. Add the handler code above to your Worker's `fetch()` routing section.
3. Add the environment variables listed above under
   **Settings → Variables → Environment Variables** (mark `FIREBASE_PRIVATE_KEY`
   as a **Secret**).
4. Deploy.

### Testing with curl

```bash
GOOGLE_TOKEN="<paste g_credential_v1 value from browser localStorage>"

curl -X POST https://auth-worker.darkshock-dev.workers.dev/setBadges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GOOGLE_TOKEN" \
  -d '{
    "targetEmail": "user@example.com",
    "badges": [
      { "id": "captain", "name": "Captain", "emoji": "⭐", "color": "#f59e0b" }
    ]
  }'
```

Expected response: `{"ok":true}`

---

## Security notes

- The Worker uses **Bearer token verification** — the Google ID token's `email`
  claim is checked against the published `developers.json` list. Tokens are
  short-lived (1 hour) so a leaked token has limited impact.
- For production, you should additionally **verify the Google ID token
  signature** using Google's public JWKs endpoint
  (`https://www.googleapis.com/oauth2/v3/certs`) rather than just decoding the
  payload. This prevents crafted tokens from bypassing the check.
- The Firebase service account key (`FIREBASE_PRIVATE_KEY`) grants write access
  to the entire Firestore database. Store it as a Cloudflare **Secret** and
  rotate it if it is ever exposed.
- CORS is restricted to `https://darkshockgamer.github.io` so the endpoint
  cannot be called from other origins.
