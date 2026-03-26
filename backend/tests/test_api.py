"""Integration tests for the API routes using an in-memory SQLite database."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Instance, InstanceStatus, InstanceVisibility


@pytest.fixture()
def client():
    """Provide a TestClient backed by a fresh in-memory database."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def registered(client):
    """Register an instance and return the response JSON + client."""
    resp = client.post(
        "/api/register",
        json={
            "display_name": "Test Mesh",
            "url": "https://mesh.example.com/",
            "reporting_mode": "heartbeat",
            "software_version": "1.0.0",
        },
    )
    assert resp.status_code == 201
    return resp.json(), client


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def test_register_new_instance(client):
    resp = client.post(
        "/api/register",
        json={
            "display_name": "My Mesh",
            "url": "https://mesh.example.com/",
            "description": "A test mesh",
            "country": "US",
            "region": "CA",
            "reporting_mode": "stats",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["canonical_url"] == "mesh.example.com"
    assert data["status"] == "pending"
    assert len(data["token"]) == 64  # 32 bytes hex


def test_register_duplicate_url(client):
    payload = {"display_name": "My Mesh", "url": "https://mesh.example.com/"}
    client.post("/api/register", json=payload)
    resp = client.post("/api/register", json=payload)
    assert resp.status_code == 409


def test_register_invalid_url(client):
    resp = client.post(
        "/api/register",
        json={"display_name": "Bad", "url": ""},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Public listing (pending instances must be invisible)
# ---------------------------------------------------------------------------

def test_pending_instance_not_listed(client):
    client.post(
        "/api/register",
        json={"display_name": "Pending Mesh", "url": "https://pending.example.com/"},
    )
    resp = client.get("/api/instances")
    assert resp.status_code == 200
    assert resp.json() == []


def test_approved_instance_listed(client):
    # Register
    reg = client.post(
        "/api/register",
        json={"display_name": "Approved Mesh", "url": "https://approved.example.com/"},
    )
    instance_id = reg.json()["id"]

    # Manually approve via the DB override (simulate admin action)
    db_gen = client.app.dependency_overrides[get_db]()
    db = next(db_gen)
    instance = db.get(Instance, instance_id)
    instance.status = InstanceStatus.approved
    instance.visibility = InstanceVisibility.public
    db.commit()
    try:
        next(db_gen)
    except StopIteration:
        pass

    resp = client.get("/api/instances")
    assert resp.status_code == 200
    instances = resp.json()
    assert len(instances) == 1
    assert instances[0]["display_name"] == "Approved Mesh"
    assert instances[0]["canonical_url"] == "approved.example.com"


# ---------------------------------------------------------------------------
# Heartbeat
# ---------------------------------------------------------------------------

def test_heartbeat_valid_token(registered):
    data, client = registered
    resp = client.post(
        f"/api/instances/{data['id']}/heartbeat",
        json={"token": data["token"], "software_version": "1.1.0"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == data["id"]
    assert "last_seen_at" in body


def test_heartbeat_invalid_token(registered):
    data, client = registered
    resp = client.post(
        f"/api/instances/{data['id']}/heartbeat",
        json={"token": "badtoken"},
    )
    assert resp.status_code == 401


def test_heartbeat_unknown_instance(client):
    resp = client.post(
        "/api/instances/999/heartbeat",
        json={"token": "sometoken"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

def test_stats_valid(registered):
    data, client = registered
    resp = client.post(
        f"/api/instances/{data['id']}/stats",
        json={
            "token": data["token"],
            "node_count": 42,
            "map_bounds_coarse": "37.0,-122.5,38.5,-121.0",
            "software_version": "1.0.1",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == data["id"]


def test_stats_invalid_token(registered):
    data, client = registered
    resp = client.post(
        f"/api/instances/{data['id']}/stats",
        json={"token": "wrong"},
    )
    assert resp.status_code == 401
