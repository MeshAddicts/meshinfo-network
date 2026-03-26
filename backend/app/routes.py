"""API route definitions."""

import json
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .canonicalize import canonicalize_url
from .database import get_db
from .models import Instance, InstanceEvent, InstanceStatsSnapshot, InstanceStatus, InstanceVisibility
from .schemas import (
    HeartbeatRequest,
    HeartbeatResponse,
    PublicInstance,
    PublicInstanceDetail,
    RegisterRequest,
    RegisterResponse,
    StatsRequest,
    StatsResponse,
)
from .security import generate_token, hash_token, verify_token

router = APIRouter()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@router.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Public instance listing
# ---------------------------------------------------------------------------

@router.get("/instances", response_model=list[PublicInstance])
def list_instances(db: Annotated[Session, Depends(get_db)]):
    """Return all approved + public instances."""
    instances = (
        db.query(Instance)
        .filter(
            Instance.status == InstanceStatus.approved,
            Instance.visibility == InstanceVisibility.public,
        )
        .order_by(Instance.display_name)
        .all()
    )
    return instances


@router.get("/instances/{instance_id}", response_model=PublicInstanceDetail)
def get_instance(instance_id: int, db: Annotated[Session, Depends(get_db)]):
    """Return a single approved + public instance by ID."""
    instance = db.get(Instance, instance_id)
    if not instance or instance.status != InstanceStatus.approved or instance.visibility != InstanceVisibility.public:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instance not found")

    latest_snapshot = (
        db.query(InstanceStatsSnapshot)
        .filter(InstanceStatsSnapshot.instance_id == instance_id)
        .order_by(InstanceStatsSnapshot.payload_received_at.desc())
        .first()
    )

    result = PublicInstanceDetail.model_validate(instance)
    if latest_snapshot:
        result.latest_node_count = latest_snapshot.node_count
        result.latest_map_bounds_coarse = latest_snapshot.map_bounds_coarse
        result.latest_stats_at = latest_snapshot.payload_received_at

    return result


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Annotated[Session, Depends(get_db)]):
    """Register a new MeshInfo instance or re-authenticate an existing one."""
    try:
        canonical = canonicalize_url(payload.url)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    existing = db.query(Instance).filter(Instance.canonical_url == canonical).first()

    if existing is not None:
        # Canonical URL already registered – reject without leaking info.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An instance with this canonical URL already exists. "
                "If you own it and need to rotate your token, contact an admin."
            ),
        )

    token = generate_token()
    token_hash = hash_token(token)

    instance = Instance(
        display_name=payload.display_name,
        canonical_url=canonical,
        original_url=payload.url,
        description=payload.description,
        country=payload.country,
        region=payload.region,
        metro=payload.metro,
        contact_url=payload.contact_url,
        contact_email=payload.contact_email,
        reporting_mode=payload.reporting_mode,
        software_version=payload.software_version,
        auth_token_hash=token_hash,
        status=InstanceStatus.pending,
        visibility=InstanceVisibility.public,
    )
    db.add(instance)
    db.flush()

    _log_event(db, instance.id, "registered")
    db.commit()
    db.refresh(instance)

    return RegisterResponse(
        id=instance.id,
        canonical_url=instance.canonical_url,
        token=token,
        status=instance.status,
        message=(
            "Registration successful. Your instance is pending review. "
            "Store your token securely – it will not be shown again."
        ),
    )


# ---------------------------------------------------------------------------
# Heartbeat
# ---------------------------------------------------------------------------

@router.post("/instances/{instance_id}/heartbeat", response_model=HeartbeatResponse)
def heartbeat(
    instance_id: int,
    payload: HeartbeatRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """Accept a heartbeat from a registered instance."""
    instance = _authenticate_instance(instance_id, payload.token, db)

    now = datetime.now(timezone.utc)
    instance.last_seen_at = now
    if payload.software_version:
        instance.software_version = payload.software_version

    _log_event(db, instance.id, "heartbeat")
    db.commit()
    db.refresh(instance)

    return HeartbeatResponse(
        id=instance.id,
        last_seen_at=instance.last_seen_at,
        message="Heartbeat received.",
    )


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@router.post("/instances/{instance_id}/stats", response_model=StatsResponse)
def stats(
    instance_id: int,
    payload: StatsRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """Accept a coarse stats update from a registered instance."""
    instance = _authenticate_instance(instance_id, payload.token, db)

    now = datetime.now(timezone.utc)
    instance.last_seen_at = now
    if payload.software_version:
        instance.software_version = payload.software_version

    snapshot = InstanceStatsSnapshot(
        instance_id=instance.id,
        node_count=payload.node_count,
        map_bounds_coarse=payload.map_bounds_coarse,
        last_data_refresh_at=payload.last_data_refresh_at,
        software_version=payload.software_version,
        payload_received_at=now,
    )
    db.add(snapshot)
    _log_event(db, instance.id, "stats")
    db.commit()
    db.refresh(instance)

    return StatsResponse(
        id=instance.id,
        last_seen_at=instance.last_seen_at,
        message="Stats received.",
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _authenticate_instance(instance_id: int, token: str, db: Session) -> Instance:
    """Validate instance exists and token matches. Raises 401/404 on failure."""
    instance = db.get(Instance, instance_id)
    if not instance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instance not found")
    if not instance.auth_token_hash or not verify_token(token, instance.auth_token_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return instance


def _log_event(db: Session, instance_id: int, event_type: str, metadata: dict | None = None) -> None:
    event = InstanceEvent(
        instance_id=instance_id,
        event_type=event_type,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(event)
