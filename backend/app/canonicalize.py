"""URL canonicalization for MeshInfo instance URLs.

Canonical URL rules:
- Strip protocol (http:// or https://)
- Strip trailing slash(es)
- Preserve subdomain
- Preserve path
- Normalize host to lowercase
- Preserve path casing as-is
- Reject empty or clearly invalid URLs

Examples:
  https://mesh.example.com/        -> mesh.example.com
  http://mesh.example.com/foo/     -> mesh.example.com/foo
  https://sub.mesh.example.com/bar -> sub.mesh.example.com/bar
  https://EXAMPLE.COM/Foo          -> example.com/Foo
"""

from urllib.parse import urlparse


def canonicalize_url(url: str) -> str:
    """Return the canonical form of a MeshInfo instance URL.

    Raises ValueError for empty or unparseable URLs.
    """
    if not url or not url.strip():
        raise ValueError("URL must not be empty")

    raw = url.strip()

    # If no scheme is present, add a temporary one so urlparse works correctly.
    if not raw.startswith("http://") and not raw.startswith("https://"):
        raw = "https://" + raw

    parsed = urlparse(raw)

    host = parsed.hostname  # always lowercased by urlparse
    if not host:
        raise ValueError(f"Could not parse host from URL: {url!r}")

    # Reconstruct with port only if non-standard
    port = parsed.port
    if port and not ((parsed.scheme == "https" and port == 443) or (parsed.scheme == "http" and port == 80)):
        netloc = f"{host}:{port}"
    else:
        netloc = host

    # Strip trailing slashes from path, but keep the path itself
    path = parsed.path.rstrip("/")

    canonical = netloc + path
    return canonical
