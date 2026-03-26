# MeshInfo Network

Central directory for [MeshInfo](https://github.com/MeshAddicts/meshinfo) instances — a community-run website where people can discover Meshtastic mesh networks that are using MeshInfo.

🌐 **Live site**: [https://meshinfo.network](https://meshinfo.network)

---

## What Is MeshInfo Network?

MeshInfo Network is a registry/directory where individual MeshInfo instances can list themselves. It provides:

- A public landing page explaining what MeshInfo is
- A browseable directory of approved MeshInfo instances
- A registration/authentication API for MeshInfo instances to submit themselves and send periodic updates

---

## Architecture

```
frontend/       React + TypeScript + Vite + Tailwind CSS
backend/        FastAPI + SQLAlchemy + SQLite (or Postgres)
migrations/     Alembic migration scripts
docs/           Additional documentation
docker-compose.yml
Dockerfile
Caddyfile
```

The frontend is a single-page React app served as static files. The backend is a FastAPI app that exposes a REST API. In production both are served behind Caddy.

---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API available at `http://localhost:8000`  
API docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`

The Vite dev server proxies `/api/*` requests to `http://localhost:8000`, so you can run frontend and backend independently.

---

## Docker

```bash
# Build and start all services
docker compose up --build

# App available at http://localhost:80
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./meshinfo_network.db` | Database connection string |

Copy `backend/.env.example` to `backend/.env` to get started.

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | `` (empty) | API base URL. Leave empty in dev (Vite proxy handles it). Set to full URL in production if needed. |

---

## Database Setup & Migrations

The app uses [Alembic](https://alembic.sqlalchemy.org/) for migrations.

```bash
cd backend

# Apply all migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "describe change"

# Downgrade one step
alembic downgrade -1
```

In development, `Base.metadata.create_all()` is called on startup as a convenience. Use migrations for production.

### PostgreSQL

Set `DATABASE_URL` to a Postgres DSN:

```
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/meshinfo_network
```

Install the Postgres driver:

```bash
pip install psycopg2-binary
```

---

## Public API Overview

All public endpoints are under `/api/`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/instances` | List all approved + public instances |
| `GET` | `/api/instances/{id}` | Get a single approved + public instance |
| `POST` | `/api/register` | Register a new MeshInfo instance |
| `POST` | `/api/instances/{id}/heartbeat` | Send a heartbeat (requires token) |
| `POST` | `/api/instances/{id}/stats` | Send coarse stats (requires token) |

Interactive API docs: `http://localhost:8000/docs`

---

## Registration & Token Flow

### Initial Registration

```http
POST /api/register
Content-Type: application/json

{
  "display_name": "My Mesh",
  "url": "https://mesh.example.com/",
  "description": "A Meshtastic network in Example City",
  "country": "US",
  "region": "CA",
  "metro": "Example City",
  "reporting_mode": "heartbeat",
  "software_version": "1.2.3"
}
```

Response (201 Created):

```json
{
  "id": 42,
  "canonical_url": "mesh.example.com",
  "token": "a1b2c3d4...64hexchars...",
  "status": "pending",
  "message": "Registration successful. Your instance is pending review. Store your token securely – it will not be shown again."
}
```

**Important**: Store the `token` securely. It is shown only once and is required for all future authenticated requests.

### Heartbeat

```http
POST /api/instances/42/heartbeat
Content-Type: application/json

{
  "token": "a1b2c3d4...",
  "software_version": "1.2.4"
}
```

### Stats

```http
POST /api/instances/42/stats
Content-Type: application/json

{
  "token": "a1b2c3d4...",
  "node_count": 128,
  "map_bounds_coarse": "37.0,-122.5,38.5,-121.0",
  "software_version": "1.2.4"
}
```

---

## Reporting Modes

| Mode | Description |
|------|-------------|
| `none` | **Default.** No outbound calls. No registration, no heartbeat, no stats. |
| `heartbeat` | Registers on startup and sends lightweight "I am alive" updates. |
| `stats` | Includes heartbeat behavior plus periodic coarse stats (node count, map bounds). |

---

## URL Canonicalization

Instance URLs are canonicalized before storage to prevent duplicates. Rules:

| Rule | Example |
|------|---------|
| Strip protocol | `https://` → removed |
| Strip trailing slashes | `/foo/` → `/foo` |
| Normalize host to lowercase | `EXAMPLE.COM` → `example.com` |
| Preserve subdomain | `sub.example.com` preserved |
| Preserve path | `/foo/bar` preserved |
| Preserve path casing | `/Foo` preserved as-is |
| Strip standard ports | `:443` on https, `:80` on http stripped |

Examples:

```
https://mesh.example.com/          → mesh.example.com
http://mesh.example.com/foo/       → mesh.example.com/foo
https://sub.mesh.example.com/bar/  → sub.mesh.example.com/bar
https://EXAMPLE.COM/Foo            → example.com/Foo
```

---

## Moderation / Approval Model

New registrations start in **pending** state and are **never visible publicly** until a maintainer approves them.

| Status | Publicly visible? |
|--------|-------------------|
| `pending` | No |
| `approved` | Yes (if `visibility=public`) |
| `rejected` | No |
| `hidden` | No |

Visibility values:
- `public` — visible in public listings when approved
- `unlisted` — hidden from listings even if approved

Heartbeat and stats updates are accepted for pending instances, but the instance remains invisible until approved.

---

## MeshInfo Integration Plan

See [docs/meshinfo-integration.md](docs/meshinfo-integration.md) for the full plan describing how to integrate reporting into the MeshInfo codebase.

---

## Tests

### Backend

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest tests/ -v
```

---

## License

MIT
