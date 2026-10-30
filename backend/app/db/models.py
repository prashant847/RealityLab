"""SQLAlchemy models. Only generic types (JSON, String, Integer) are used so the schema ports to
PostgreSQL/Supabase unchanged.

A *simulation* is a family of *runs*. Rewinding never edits a run: it creates a child run that
starts from a copy of an earlier checkpoint, so the failed attempt stays intact for review.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Simulation(Base):
    __tablename__ = "simulations"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    seed: Mapped[int] = mapped_column(Integer)
    root_run_id: Mapped[str | None] = mapped_column(String(32))
    active_run_id: Mapped[str | None] = mapped_column(String(32))
    max_rewinds: Mapped[int] = mapped_column(Integer, default=5)
    rewinds_used: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Run(Base):
    __tablename__ = "runs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    simulation_id: Mapped[str] = mapped_column(ForeignKey("simulations.id"), index=True)
    parent_run_id: Mapped[str | None] = mapped_column(ForeignKey("runs.id"))
    branch_checkpoint_index: Mapped[int | None] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(20), default="main")  # main | rewind | replay | restart
    attempt: Mapped[int] = mapped_column(Integer, default=1)
    # active | dead_end | completed | superseded
    status: Mapped[str] = mapped_column(String(20), default="active")
    accepted_risk: Mapped[bool] = mapped_column(Boolean, default=False)
    state: Mapped[dict[str, Any]] = mapped_column(JSON)
    classification: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    ending: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Checkpoint(Base):
    """State *before* decision `idx`. Random rolls are keyed by (seed, event, round), so `seed`
    plus the state is a complete replay position; `replay_position` is the decision count."""
    __tablename__ = "checkpoints"
    __table_args__ = (UniqueConstraint("run_id", "idx"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    idx: Mapped[int] = mapped_column(Integer)
    round: Mapped[int] = mapped_column(Integer)
    clock: Mapped[str] = mapped_column(String(16))
    state: Mapped[dict[str, Any]] = mapped_column(JSON)
    available_actions: Mapped[list[Any]] = mapped_column(JSON)
    active_risks: Mapped[list[Any]] = mapped_column(JSON)
    event_queue: Mapped[list[Any]] = mapped_column(JSON)
    resources: Mapped[dict[str, Any]] = mapped_column(JSON)
    seed: Mapped[int] = mapped_column(Integer)
    replay_position: Mapped[int] = mapped_column(Integer)
    inherited: Mapped[bool] = mapped_column(Boolean, default=False)
    viable: Mapped[bool | None] = mapped_column(Boolean)  # cached planner verdict


class DecisionRow(Base):
    __tablename__ = "decisions"
    __table_args__ = (UniqueConstraint("run_id", "idx"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    idx: Mapped[int] = mapped_column(Integer)
    round: Mapped[int] = mapped_column(Integer)
    choice_id: Mapped[str] = mapped_column(String(40))
    record: Mapped[dict[str, Any]] = mapped_column(JSON)
    outcome: Mapped[dict[str, Any]] = mapped_column(JSON)
    inherited: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class EventRow(Base):
    __tablename__ = "events"
    __table_args__ = (UniqueConstraint("run_id", "idx"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    idx: Mapped[int] = mapped_column(Integer)
    round: Mapped[int] = mapped_column(Integer)
    event_id: Mapped[str] = mapped_column(String(40))
    record: Mapped[dict[str, Any]] = mapped_column(JSON)
    inherited: Mapped[bool] = mapped_column(Boolean, default=False)


class StakeholderInteraction(Base):
    __tablename__ = "stakeholder_interactions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    round: Mapped[int] = mapped_column(Integer)
    stakeholder: Mapped[str] = mapped_column(String(20))
    request: Mapped[dict[str, Any]] = mapped_column(JSON)
    response: Mapped[dict[str, Any]] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(20), default="policy")  # policy | llm
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), unique=True)
    score: Mapped[float | None] = mapped_column(Float)
    report: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
