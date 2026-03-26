"""Tests for the security (token) utilities."""

from app.security import generate_token, hash_token, verify_token


def test_generate_token_length():
    token = generate_token()
    # 32 bytes -> 64 hex chars
    assert len(token) == 64


def test_tokens_are_unique():
    assert generate_token() != generate_token()


def test_verify_token_correct():
    token = generate_token()
    hashed = hash_token(token)
    assert verify_token(token, hashed) is True


def test_verify_token_wrong():
    token = generate_token()
    hashed = hash_token(token)
    assert verify_token("wrong_token", hashed) is False


def test_verify_token_tampered_hash():
    token = generate_token()
    hashed = hash_token(token)
    tampered = hashed[:-1] + ("0" if hashed[-1] != "0" else "1")
    assert verify_token(token, tampered) is False
