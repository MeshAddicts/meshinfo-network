# URL Canonicalization

MeshInfo Network uses a canonical URL as the **unique identity key** for every registered instance.
The same canonicalization algorithm must be used at registration, duplicate detection, lookup, and in the MeshInfo integration.

## Rules

| Step | Action |
|------|--------|
| 1 | Remove protocol (`http://`, `https://`) |
| 2 | Strip trailing slashes |
| 3 | Lowercase the hostname only |
| 4 | Preserve path casing as-is |
| 5 | Drop query strings and fragments |
| 6 | Reject empty / unparseable input |

## Examples

| Input | Canonical |
|-------|-----------|
| `https://mesh.example.com/` | `mesh.example.com` |
| `http://mesh.example.com/foo/` | `mesh.example.com/foo` |
| `https://sub.mesh.example.com/bar/` | `sub.mesh.example.com/bar` |
| `MESH.EXAMPLE.COM` | `mesh.example.com` |
| `http://mesh.example.com:8080/` | `mesh.example.com:8080` |

## What is NOT stripped

- Subdomains (e.g. `sub.mesh.example.com`)
- Paths (e.g. `/bar`)
- Port numbers (e.g. `:8080`)

## Implementation

See [`strapi/src/lib/canonicalUrl.js`](../strapi/src/lib/canonicalUrl.js) for the reference implementation.

The same logic must be replicated in any MeshInfo client integration (Python).

## Security implications

Canonical URL is the **primary duplicate-detection key** in the database (`canonicalUrl` has a `UNIQUE` constraint).

If canonicalization is inconsistent between registration and heartbeat/stats requests, instances may fail to authenticate or duplicate entries may be created.
