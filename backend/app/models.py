"""SQLAlchemy ORM models for meshinfo-network."""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class InstanceStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    hidden = "hidden"


class InstanceVisibility(str, enum.Enum):
    public = "public"
    unlisted = "unlisted"


class ReportingMode(str, enum.Enum):
    none = "none"
    heartbeat = "heartbeat"
    stats = "stats"


class Instance(Base):
    __tablename__ = "instances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    canonical_url: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, index=True)
    original_url: Mapped[str] = mapped_column(String(512), nullable=False)
    slug: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(String(10), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    metro: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[InstanceStatus] = mapped_column(
        Enum(InstanceStatus), nullable=False, default=InstanceStatus.pending
    )
    visibility: Mapped[InstanceVisibility] = mapped_column(
        Enum(InstanceVisibility), nullable=False, default=InstanceVisibility.public
    )
    reporting_mode: Mapped[ReportingMode] = mapped_column(
        Enum(ReportingMode), nullable=False, default=ReportingMode.none
    )
    auth_token_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    software_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes_internal: Mapped[str | None] = mapped_column(Text, nullable=True)

    stats_snapshots: Mapped[list["InstanceStatsSnapshot"]] = relationship(
        back_populates="instance", cascade="all, delete-orphan"
    )
    events: Mapped[list["InstanceEvent"]] = relationship(
        back_populates="instance", cascade="all, delete-orphan"
    )


class InstanceStatsSnapshot(Base):
    __tablename__ = "instance_stats_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    instance_id: Mapped[int] = mapped_column(Integer, ForeignKey("instances.id"), nullable=False, index=True)
    node_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Coarse geographic bounds represented as comma-separated floats: "min_lat,min_lon,max_lat,max_lon"
    map_bounds_coarse: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_data_refresh_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    software_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payload_received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    instance: Mapped["Instance"] = relationship(back_populates="stats_snapshots")


class InstanceEvent(Base):
    __tablename__ = "instance_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    instance_id: Mapped[int] = mapped_column(Integer, ForeignKey("instances.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    instance: Mapped["Instance"] = relationship(back_populates="events")
