# MeshInfo Integration Plan (Phase 2)

This document describes how to add MeshInfo Network reporting to the [MeshInfo](https://github.com/MeshAddicts/meshinfo) Python application.

## New Configuration Keys

Add the following to MeshInfo's configuration (YAML / env):

```yaml
reporting:
  mode: none          # none | heartbeat | stats  (default: none)
  base_url: ""        # e.g. https://meshinfo.network
  instance_name: ""   # Display name for this instance
  instance_url: ""    # Public URL of this MeshInfo deployment
  contact_url: ""     # Optional contact link
  contact_email: ""   # Optional contact email
  country: ""         # ISO 3166-1 alpha-2 (e.g. US)
  region: ""          # e.g. CA
  metro: ""           # e.g. Sacramento
```

The `mode` key controls all outbound behavior:

- `none` — absolutely no outbound calls (default, privacy-preserving)
- `heartbeat` — register on startup, send periodic pings
- `stats` — heartbeat + coarse stats snapshot

## Token Storage

On first successful registration, the returned token must be stored persistently.

Suggested approach: write to a file like `.meshinfo_network_token` in the working directory (or a path from config).

```python
TOKEN_FILE = Path(config.get('reporting.token_file', '.meshinfo_network_token'))

def save_token(token: str) -> None:
    TOKEN_FILE.write_text(token)
    TOKEN_FILE.chmod(0o600)

def load_token() -> str | None:
    if TOKEN_FILE.exists():
        return TOKEN_FILE.read_text().strip() or None
    return None
```

## URL Canonicalization

MeshInfo must apply the same canonicalization rules as the server when sending its own `instance_url`.

```python
import re
from urllib.parse import urlparse

def canonical_url(raw: str) -> str:
    raw = raw.strip()
    if not re.match(r'^https?://', raw, re.IGNORECASE):
        raw = 'https://' + raw
    parsed = urlparse(raw)
    host = parsed.hostname or ''
    port = f':{parsed.port}' if parsed.port else ''
    path = parsed.path.rstrip('/')
    return f'{host}{port}{path}'
```

## Registration Flow

```python
import httpx, logging

log = logging.getLogger(__name__)

async def register(config) -> str | None:
    """Register this instance and return the token. Returns None on failure."""
    try:
        resp = httpx.post(
            f"{config.reporting.base_url}/api/register",
            json={
                'displayName': config.reporting.instance_name,
                'url': config.reporting.instance_url,
                'description': config.get('reporting.description'),
                'country': config.reporting.country,
                'region': config.reporting.region,
                'metro': config.reporting.metro,
                'contactUrl': config.reporting.contact_url,
                'contactEmail': config.reporting.contact_email,
                'reportingMode': config.reporting.mode,
                'softwareVersion': meshinfo.__version__,
            },
            timeout=10,
        )
        if resp.status_code == 201:
            data = resp.json()
            return data.get('token')
        elif resp.status_code == 409:
            log.warning('meshinfo-network: instance already registered; token required for updates')
        else:
            log.warning('meshinfo-network: registration failed: %s', resp.status_code)
    except Exception as exc:
        log.warning('meshinfo-network: registration error (non-fatal): %s', exc)
    return None
```

## Startup Behavior

```python
async def on_startup(config) -> None:
    if config.reporting.mode == 'none':
        return

    instance_id = config.get('reporting.instance_id')
    token = load_token()

    if not instance_id or not token:
        token = await register(config)
        if token:
            save_token(token)
            config.set('reporting.instance_id', ...)  # save id from response
        else:
            log.warning('meshinfo-network: could not register — running without reporting')
            return

    await send_heartbeat(config, token)
```

## Heartbeat

```python
async def send_heartbeat(config, token: str) -> None:
    try:
        httpx.post(
            f"{config.reporting.base_url}/api/instances/{config.reporting.instance_id}/heartbeat",
            json={'token': token, 'softwareVersion': meshinfo.__version__},
            timeout=10,
        )
    except Exception as exc:
        log.warning('meshinfo-network: heartbeat error (non-fatal): %s', exc)
```

## Stats Snapshot

```python
async def send_stats(config, token: str, node_data) -> None:
    if config.reporting.mode != 'stats':
        return
    try:
        httpx.post(
            f"{config.reporting.base_url}/api/instances/{config.reporting.instance_id}/stats",
            json={
                'token': token,
                'softwareVersion': meshinfo.__version__,
                'nodeCount': len(node_data.nodes),
                'boundsNorth': node_data.bounds_north,
                'boundsSouth': node_data.bounds_south,
                'boundsEast': node_data.bounds_east,
                'boundsWest': node_data.bounds_west,
            },
            timeout=10,
        )
    except Exception as exc:
        log.warning('meshinfo-network: stats error (non-fatal): %s', exc)
```

## Error Handling Requirements

- Reporting failures **must never raise exceptions** that affect core MeshInfo operation.
- All reporting calls should be wrapped in try/except with `log.warning(...)`.
- If registration fails, MeshInfo continues operating normally — just without reporting.
- If the token is lost and re-registration fails (409 conflict), log a warning and disable reporting for the session.

## Periodic Scheduling

Heartbeat/stats should be sent:
- On startup (after a brief delay)
- Every N minutes (suggest 15–60 minutes)

Use MeshInfo's existing scheduler/async loop — do not introduce a new background thread.
