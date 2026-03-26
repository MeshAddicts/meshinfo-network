# MeshInfo Integration Plan

This document describes how to add meshinfo-network reporting support to [MeshAddicts/meshinfo](https://github.com/MeshAddicts/meshinfo).

---

## Overview

MeshInfo instances can optionally report their presence and coarse stats to meshinfo-network. The behavior is opt-in and controlled by configuration. The default mode is `none` — no outbound calls are made unless explicitly configured.

---

## Configuration

Add the following to `config.toml` (or the equivalent config source):

```toml
[reporting]
# Reporting mode: none | heartbeat | stats
# Default is none — no outbound calls
mode = "none"

# Base URL of the meshinfo-network instance
base_url = "https://meshinfo.network"

# Your instance's display name (used during registration)
instance_name = "My Mesh"

# The public URL of this MeshInfo instance
instance_url = "https://mesh.example.com"

# Optional contact information
contact_url = ""
contact_email = ""

# Optional coarse location (do not use precise coordinates)
country = "US"
region = "CA"
metro = "Example City"
```

### Config environment variable mapping

For Docker deployments, map these to environment variables:

| Env var | Config key |
|---------|-----------|
| `REPORTING_MODE` | `reporting.mode` |
| `REPORTING_BASE_URL` | `reporting.base_url` |
| `REPORTING_INSTANCE_NAME` | `reporting.instance_name` |
| `REPORTING_INSTANCE_URL` | `reporting.instance_url` |
| `REPORTING_CONTACT_URL` | `reporting.contact_url` |
| `REPORTING_CONTACT_EMAIL` | `reporting.contact_email` |
| `REPORTING_COUNTRY` | `reporting.country` |
| `REPORTING_REGION` | `reporting.region` |
| `REPORTING_METRO` | `reporting.metro` |

---

## Token Storage

When `mode=heartbeat` or `mode=stats`, MeshInfo registers with meshinfo-network and receives a secret token. This token must be stored persistently so it survives restarts.

**Suggested token storage location**: `data/reporting_token.txt` (or configurable path)

Token storage rules:
- Read the token from disk on startup.
- If no token file exists, register and save the returned token to disk.
- If registration fails on startup, log a warning and continue. Reporting failures are **non-fatal**.
- Never log the token value.
- Never commit the token to source control (add to `.gitignore`).

---

## Behavior by Mode

### `none` (default)

- Make zero outbound calls.
- No registration, no heartbeat, no stats.
- Complete silence.

### `heartbeat`

On startup:
1. Read token from `data/reporting_token.txt`.
2. If no token: call `POST /api/register` with instance info.
3. Save returned token to disk.
4. Call `POST /api/instances/{id}/heartbeat` to signal startup.

Periodically (e.g. every 30 minutes):
- Call `POST /api/instances/{id}/heartbeat` with optional updated `software_version`.

### `stats`

Same as `heartbeat`, plus:

On startup and periodically (e.g. every 30 minutes):
- Gather coarse stats:
  - `node_count`: number of active nodes (coarse, whole number)
  - `map_bounds_coarse`: coarse bounding box as `"min_lat,min_lon,max_lat,max_lon"` (round to 1 decimal place)
  - `software_version`: current version string
  - `last_data_refresh_at`: last time data was updated from the mesh
- Call `POST /api/instances/{id}/stats` with the above payload.

---

## Registration Payload

```python
{
    "display_name": config.reporting.instance_name,
    "url": config.reporting.instance_url,
    "description": None,  # optional, could be config-driven
    "country": config.reporting.country,
    "region": config.reporting.region,
    "metro": config.reporting.metro,
    "contact_url": config.reporting.contact_url,
    "contact_email": config.reporting.contact_email,
    "reporting_mode": config.reporting.mode,
    "software_version": VERSION,
}
```

---

## URL Canonicalization

Both meshinfo-network and meshinfo must use the same canonicalization rules so the instance URL identity is consistent. Rules:

- Strip protocol (`http://`, `https://`)
- Strip trailing slashes
- Normalize host to lowercase
- Preserve path
- Preserve path casing
- Strip standard ports (`:443` on https, `:80` on http)

Implement as a shared helper function in meshinfo.

---

## Re-registration

If a stored token becomes invalid (e.g. 401 response), meshinfo should:
1. Log a warning.
2. Delete the stored token file.
3. Attempt re-registration on the next heartbeat/stats cycle.
4. If re-registration fails, log a warning and continue. Do not crash.

---

## Failure Handling

All reporting calls must be wrapped in try/except. Failures must be:
- Logged at `WARNING` level.
- Non-fatal — never interrupt mesh data collection or the web server.
- Retried on the next cycle (do not implement complex retry logic in v1).

---

## Suggested Implementation Structure

```
meshinfo/
  reporting/
    __init__.py
    client.py         # HTTP client for meshinfo-network API
    reporter.py       # Reporting logic (register, heartbeat, stats)
    token_store.py    # Read/write token from disk
    canonicalize.py   # URL canonicalization (same rules as meshinfo-network)
```

---

## Privacy Notes

- Stats mode sends only coarse data: node count (integer), rounded map bounds (1 decimal), version string.
- No node IDs, no message content, no precise locations.
- Configuration and privacy implications must be documented in the MeshInfo README.
- Default mode is `none` — opt-in only.

---

## Phase 2 Checklist

- [ ] Add `[reporting]` config section to `config.py` / `config.toml.sample`
- [ ] Implement `reporting/canonicalize.py` with same rules as meshinfo-network
- [ ] Implement `reporting/token_store.py`
- [ ] Implement `reporting/client.py` (async HTTP client)
- [ ] Implement `reporting/reporter.py` (startup + periodic tasks)
- [ ] Integrate into startup sequence (non-fatal)
- [ ] Add periodic task to existing scheduler
- [ ] Add `data/reporting_token.txt` to `.gitignore`
- [ ] Document in README
