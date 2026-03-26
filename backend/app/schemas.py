"""Pydantic schemas for request/response validation."""

from datetime import datetime

from pydantic import BaseModel, field_validator

from .models import InstanceStatus, InstanceVisibility, ReportingMode


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    display_name: str
    url: str
    description: str | None = None
    country: str | None = None
    region: str | None = None
    metro: str | None = None
    contact_url: str | None = None
    contact_email: str | None = None
    reporting_mode: ReportingMode = ReportingMode.none
    software_version: str | None = None

    @field_validator("display_name")
    @classmethod
    def display_name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("display_name must not be empty")
        return v.strip()


class RegisterResponse(BaseModel):
    id: int
    canonical_url: str
    token: str
    status: InstanceStatus
    message: str


# ---------------------------------------------------------------------------
# Heartbeat
# ---------------------------------------------------------------------------

class HeartbeatRequest(BaseModel):
    token: str
    software_version: str | None = None


class HeartbeatResponse(BaseModel):
    id: int
    last_seen_at: datetime
    message: str


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

class StatsRequest(BaseModel):
    token: str
    software_version: str | None = None
    node_count: int | None = None
    map_bounds_coarse: str | None = None
    last_data_refresh_at: datetime | None = None


class StatsResponse(BaseModel):
    id: int
    last_seen_at: datetime
    message: str


# ---------------------------------------------------------------------------
# Public instance representation
# ---------------------------------------------------------------------------

class PublicInstance(BaseModel):
    id: int
    display_name: str
    canonical_url: str
    description: str | None
    country: str | None
    region: str | None
    metro: str | None
    contact_url: str | None
    last_seen_at: datetime | None
    software_version: str | None
    reporting_mode: ReportingMode
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicInstanceDetail(PublicInstance):
    # latest coarse stats summary if available
    latest_node_count: int | None = None
    latest_map_bounds_coarse: str | None = None
    latest_stats_at: datetime | None = None
