"""Tests for URL canonicalization."""

import pytest

from app.canonicalize import canonicalize_url


@pytest.mark.parametrize(
    "input_url, expected",
    [
        # Strip protocol and trailing slash
        ("https://mesh.example.com/", "mesh.example.com"),
        ("http://mesh.example.com/", "mesh.example.com"),
        # Preserve path
        ("http://mesh.example.com/foo/", "mesh.example.com/foo"),
        ("https://sub.mesh.example.com/bar/", "sub.mesh.example.com/bar"),
        # Preserve subdomain
        ("https://sub.mesh.example.com/", "sub.mesh.example.com"),
        # No trailing slash at all
        ("https://mesh.example.com", "mesh.example.com"),
        # Deep path
        ("https://mesh.example.com/foo/bar/baz/", "mesh.example.com/foo/bar/baz"),
        # Host lowercased, path casing preserved
        ("https://EXAMPLE.COM/Foo", "example.com/Foo"),
        # No protocol provided (treated as https)
        ("mesh.example.com", "mesh.example.com"),
        ("mesh.example.com/foo/", "mesh.example.com/foo"),
        # Non-standard port preserved
        ("https://mesh.example.com:8080/foo", "mesh.example.com:8080/foo"),
        # Standard port stripped
        ("https://mesh.example.com:443/", "mesh.example.com"),
        ("http://mesh.example.com:80/", "mesh.example.com"),
    ],
)
def test_canonicalize_url(input_url: str, expected: str):
    assert canonicalize_url(input_url) == expected


def test_canonicalize_url_empty():
    with pytest.raises(ValueError, match="empty"):
        canonicalize_url("")


def test_canonicalize_url_whitespace():
    with pytest.raises(ValueError, match="empty"):
        canonicalize_url("   ")
