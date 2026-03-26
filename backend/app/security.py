"""Token generation and verification utilities."""

import hashlib
import secrets


def generate_token() -> str:
    """Generate a cryptographically random token (32 bytes hex)."""
    return secrets.token_hex(32)


def hash_token(token: str) -> str:
    """Return the SHA-256 hex digest of a token for secure storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def verify_token(token: str, token_hash: str) -> bool:
    """Return True if the token matches the stored hash."""
    return secrets.compare_digest(hash_token(token), token_hash)
