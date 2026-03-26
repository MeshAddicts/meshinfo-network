# Registration & Token Flow

## Overview

MeshInfo Network uses a simple one-time token scheme for authenticating instance updates.

```
MeshInfo instance               meshinfo-network (Strapi)
──────────────────              ─────────────────────────
POST /api/register
  { displayName, url, ... }  ──►  canonicalize URL
                                   check for duplicate
                                   create pending record
                                   generate random token
                                   store bcrypt(token)
                              ◄──  { id, token }
store token locally
(never log or expose it)

POST /api/instances/:id/heartbeat
  { token }                  ──►  verify bcrypt(token)
                                   update lastSeenAt
                              ◄──  { ok: true }

POST /api/instances/:id/stats
  { token, nodeCount, ... }  ──►  verify bcrypt(token)
                                   update lastSeenAt
                                   store stats snapshot
                              ◄──  { ok: true }
```

## Token Security

- Tokens are 32 random bytes encoded as a 64-character hex string.
- The plaintext token is returned **exactly once**, in the initial registration response.
- Strapi stores only the **bcrypt hash** of the token — never the plaintext.
- If the token is lost, a new registration from a different URL is required.
  (Token rotation / recovery is not implemented in v1 — a pending instance can be manually managed by an admin.)

## Registration Response

```json
{
  "registered": true,
  "id": "abc123",
  "token": "a3f9...64-hex-chars...c0d1",
  "message": "Instance registered. Awaiting moderator approval before appearing publicly."
}
```

**The MeshInfo instance must store this token persistently** (e.g. in its config file or a local secrets file).

## Re-registration (existing URL)

If the canonical URL already exists in the database:

| Scenario | Behaviour |
|----------|-----------|
| Correct token provided | Fields updated, `{ registered: false, id, message }` returned |
| Wrong token provided | `401 Unauthorized` |
| No token provided | `409 Conflict` with a generic message |

This prevents accidental duplicate registrations while allowing legitimate re-registration (e.g. after a server rebuild).

## Approval Workflow

1. Registration creates a `pending` instance.
2. `pending` instances are **completely invisible** on the public site.
3. A moderator reviews the entry in the Strapi admin (`/admin`).
4. The moderator sets `status → approved` and optionally sets `approvedAt`.
5. The instance now appears on the public instances listing.

Heartbeat and stats updates are accepted for **pending** instances — they simply don't appear publicly yet.

## Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/register` | none | Register a new instance |
| `POST` | `/api/instances/:id/heartbeat` | token in body | Update lastSeenAt |
| `POST` | `/api/instances/:id/stats` | token in body | Store stats snapshot |
| `GET` | `/api/instances` | Strapi API token | List approved+public instances |
| `GET` | `/api/instances/:id` | Strapi API token | Get single approved instance |
| `GET` | `/api/health` | none | Health check |

> **Important:** All of the above endpoints live on the Strapi service which is internal-only.
> `GET /api/instances` is used by the Astro frontend **server-side only**.
> `POST /api/register`, `heartbeat`, and `stats` are intended for internal/backend-side use —
> direct public exposure should be gated by a firewall or reverse-proxy rule.
