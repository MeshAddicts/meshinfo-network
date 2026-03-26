# MeshInfo Network

**MeshInfo Network** is the centralized public directory for [MeshInfo](https://github.com/MeshAddicts/meshinfo) instances — a registry where Meshtastic mesh network operators can list their MeshInfo deployments and the community can discover them.

🌐 Live at: [https://meshinfo.network](https://meshinfo.network)

---

## What is this?

[MeshInfo](https://github.com/MeshAddicts/meshinfo) is an open-source dashboard for [Meshtastic](https://meshtastic.org) mesh networks. Anyone can run their own instance to visualize and monitor nodes in their local mesh.

**MeshInfo Network** is the discovery layer: a simple public directory showing which MeshInfo instances exist, where they are, and when they were last seen.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Public Internet                      │
└──────────────┬──────────────────────────┬───────────────┘
               │ :80                      │ :1337
        ┌──────▼──────┐           ┌───────▼───────┐
        │    nginx    │           │     nginx     │
        │ (public)    │           │ (admin only)  │
        └──────┬──────┘           └───────┬───────┘
               │                          │
        ┌──────▼──────┐           ┌───────▼───────┐
        │   Astro     │           │    Strapi     │
        │  Frontend   │──────────►│   Backend     │
        │  :4321      │  internal │   :1337       │
        └─────────────┘   fetch   └───────────────┘
                                          │
                                   ┌──────▼──────┐
                                   │   SQLite    │
                                   │   (data.db) │
                                   └─────────────┘
```

### Technology choices

| Layer | Technology | Reason |
|-------|-----------|--------|
| Backend / CMS | Strapi 5 | Content types, admin UI, moderation workflow, and API out of the box |
| Database | SQLite (via `better-sqlite3`) | Simple, zero-ops, easy to back up; Postgres-compatible via Knex |
| Frontend | Astro 5 | Static-first, minimal JS, hybrid SSR for fresh instance listings |
| Styling | Tailwind CSS | Consistent with MeshInfo's visual language |
| Reverse proxy | nginx | Routes public traffic to Astro; Strapi content API stays internal-only |
| Container | Docker Compose | Simple deployment, internal networking |

---

## Repository structure

```
meshinfo-network/
├── strapi/              # Strapi 5 backend
│   ├── config/          # database, server, admin, middleware config
│   └── src/
│       ├── lib/         # canonicalUrl.js, tokenHelper.js
│       └── api/
│           ├── mesh-instance/        # MeshInstance content type + custom routes
│           ├── stats-snapshot/       # StatsSnapshot content type
│           └── heartbeat-event/      # HeartbeatEvent content type
├── frontend/            # Astro 5 frontend
│   └── src/
│       ├── layouts/     # Layout.astro
│       ├── components/  # InstanceCard.astro
│       ├── pages/       # index.astro, instances.astro, instances/[id].astro
│       ├── lib/         # strapi.ts (server-side API client)
│       └── styles/      # global.css (Tailwind)
├── nginx/
│   └── nginx.conf       # Reverse proxy config
├── docs/
│   ├── canonical-url.md
│   ├── registration-flow.md
│   └── meshinfo-integration.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Content model

### MeshInstance

The primary entity. One record per registered MeshInfo deployment.

| Field | Type | Notes |
|-------|------|-------|
| `displayName` | string | Human-readable name |
| `canonicalUrl` | string (unique) | Normalized instance URL (identity key) |
| `originalUrl` | string | Raw URL as submitted |
| `slug` | uid | Auto-generated from displayName |
| `description` | text | Optional short description |
| `country` | string | ISO 3166-1 alpha-2 |
| `region` | string | e.g. "CA" |
| `metro` | string | e.g. "Sacramento" |
| `contactUrl` | string | Optional contact link |
| `contactEmail` | email | Optional contact email (private) |
| `status` | enum | `pending` / `approved` / `rejected` / `hidden` |
| `visibility` | enum | `public` / `unlisted` |
| `reportingMode` | enum | `none` / `heartbeat` / `stats` |
| `authTokenHash` | string (private) | bcrypt hash of the auth token |
| `lastSeenAt` | datetime | Last heartbeat/stats timestamp |
| `softwareVersion` | string | MeshInfo version string |
| `approvedAt` | datetime | When a moderator approved it |
| `internalNotes` | text (private) | Admin-only notes |

### StatsSnapshot

Coarse stats payload stored on each stats update.

| Field | Type | Notes |
|-------|------|-------|
| `meshInstance` | relation | Parent MeshInstance |
| `nodeCount` | integer | Approximate node count |
| `boundsNorth/South/East/West` | float | Coarse geographic bounds |
| `softwareVersion` | string | Version at snapshot time |
| `lastDataRefreshAt` | datetime | When the source data was last updated |
| `payloadReceivedAt` | datetime | When this snapshot was received |

### HeartbeatEvent

Log of lifecycle events from an instance.

| Field | Type | Notes |
|-------|------|-------|
| `meshInstance` | relation | Parent MeshInstance |
| `eventType` | enum | `startup` / `heartbeat` / `stats` |
| `metadata` | json | Optional context |

---

## Internal API overview

All endpoints live on the Strapi service at `http://strapi:1337/api/...`.
**These are internal only** — never directly exposed to the public internet.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | none | Health check |
| `POST` | `/api/register` | none | Register a new instance |
| `POST` | `/api/instances/:id/heartbeat` | token (body) | Update lastSeenAt |
| `POST` | `/api/instances/:id/stats` | token (body) | Store stats snapshot |
| `GET` | `/api/instances` | Bearer token | List approved+public instances |
| `GET` | `/api/instances/:id` | Bearer token | Get a single instance |

See [docs/registration-flow.md](docs/registration-flow.md) for full details.

---

## Registration & token flow

1. A MeshInfo instance calls `POST /api/register` with its name, URL, and optional metadata.
2. The URL is **canonicalized** (protocol stripped, trailing slashes removed, hostname lowercased).
3. If the canonical URL is new:
   - A `pending` record is created.
   - A random 32-byte secret token is generated, bcrypt-hashed for storage.
   - The **plaintext token is returned once** in the response body.
   - The MeshInfo instance must store this token locally.
4. Future heartbeat/stats calls must include this token for authentication.
5. `pending` instances are invisible publicly until a moderator approves them.

See [docs/registration-flow.md](docs/registration-flow.md).

---

## Reporting modes

| Mode | Behavior |
|------|----------|
| `none` *(default)* | No outbound calls. Zero reporting. |
| `heartbeat` | Registers on startup; sends periodic lightweight pings. |
| `stats` | Heartbeat + coarse stats: node count, geographic bounds, version. |

See [docs/meshinfo-integration.md](docs/meshinfo-integration.md) for the MeshInfo client implementation plan.

---

## Visibility / approval rules

| Status | Publicly visible? |
|--------|------------------|
| `pending` | No |
| `approved` + `public` | Yes |
| `approved` + `unlisted` | No |
| `rejected` | No |
| `hidden` | No |

Moderation is done entirely through the Strapi admin panel (`/admin`).

---

## URL canonicalization

The canonical URL is the **unique identity key** for each instance.

Rules:
- Strip `http://` / `https://` protocol
- Strip trailing slashes
- Lowercase the hostname
- Preserve paths, subdomains, and port numbers

Examples:
- `https://mesh.example.com/` → `mesh.example.com`
- `http://mesh.example.com/foo/` → `mesh.example.com/foo`
- `https://sub.mesh.example.com/bar/` → `sub.mesh.example.com/bar`

See [docs/canonical-url.md](docs/canonical-url.md) and [`strapi/src/lib/canonicalUrl.js`](strapi/src/lib/canonicalUrl.js).

---

## Local development

### Prerequisites

- Node.js 18 or 20
- npm

### Strapi backend

```bash
cd strapi
cp .env.example .env
# Edit .env with your secrets
npm install
npm run develop
```

Strapi admin: http://localhost:1337/admin  
API: http://localhost:1337/api

### Astro frontend

```bash
cd frontend
cp .env.example .env
# Set STRAPI_URL=http://localhost:1337 and STRAPI_TOKEN
npm install
npm run dev
```

Frontend: http://localhost:4321

---

## Docker deployment

### 1. Copy and configure environment

```bash
cp .env.example .env
# Fill in all secret values
```

### 2. Build and start

```bash
docker compose up -d --build
```

### 3. Create the Strapi admin user

Visit http://localhost:1337/admin on first run to create the initial admin user.

### 4. Create an API token for Astro

1. Open Strapi admin → Settings → API Tokens
2. Create a **Full Access** (or custom read-only) token
3. Copy the token into your `.env` as `STRAPI_TOKEN`
4. Restart the frontend service: `docker compose restart frontend`

---

## Environment variables

### Root `.env` (Docker Compose)

| Variable | Description |
|----------|-------------|
| `APP_KEYS` | Comma-separated Strapi app keys (generate random base64 values) |
| `API_TOKEN_SALT` | Salt for API token hashing |
| `ADMIN_JWT_SECRET` | Secret for admin JWT tokens |
| `TRANSFER_TOKEN_SALT` | Salt for transfer tokens |
| `JWT_SECRET` | Secret for user JWT tokens |
| `STRAPI_TOKEN` | API token for Astro → Strapi server-side calls |

### Generating secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Strapi exposure model

| Surface | Exposed publicly? |
|---------|------------------|
| Strapi admin (`/admin`) | Yes — port 1337 via nginx |
| Strapi content API (`/api/*`) | No — internal Docker network only |
| Astro public site | Yes — port 80 via nginx |

The nginx reverse proxy:
- Routes `:80` → Astro frontend (all paths)
- Routes `:1337` → Strapi admin (`/admin` and related)
- Blocks `/api` access from both public ports

Astro fetches `/api/instances` from Strapi **server-side** using the internal Docker hostname `http://strapi:1337`. The `STRAPI_TOKEN` is never sent to the browser.

---

## Future: MeshInfo integration

See [docs/meshinfo-integration.md](docs/meshinfo-integration.md) for a complete implementation plan covering:
- New config keys (`reporting_mode`, `reporting_base_url`, etc.)
- Token storage
- Registration flow
- Heartbeat and stats scheduling
- Error handling requirements
- URL canonicalization in Python
