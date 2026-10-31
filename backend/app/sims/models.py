"""Tables for the generic simulations (Bhopal, hospital) and the single local profile. They live in the same SQLite file as BLACKOUT's tables."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..db.models import Base, utcnow


class SimRun(Base):
    __tablename__ = "sim_runs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    sim_id: Mapped[str] = mapped_column(String(32), index=True)
    status: Mapped[str] = mapped_column(String(20), default="active")   # active | completed | abandoned
    attempt: Mapped[int] = mapped_column(Integer, default=1)
    state: Mapped[dict[str, Any]] = mapped_column(JSON)
    ending: Mapped[str | None] = mapped_column(String(40))
    report: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Profile(Base):
    """One local player profile (id = 1)."""
    __tablename__ = "profile"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(60), default="")
    large_text: Mapped[bool] = mapped_column(Boolean, default=False)
    reduce_motion: Mapped[bool] = mapped_column(Boolean, default=False)


class Reflection(Base):
    """How the student felt about a finished workday or crisis (1 to 5). Feeds Career Comparison. Keyed by run id, so a replay never overwrites an earlier answer."""
    __tablename__ = "reflections"
    run_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    profession: Mapped[str] = mapped_column(String(32), index=True)
    phase: Mapped[str] = mapped_column(String(12))                      # workday | crisis
    enjoyment: Mapped[int] = mapped_column(Integer)
    stress: Mapped[int] = mapped_column(Integer)
    daily_interest: Mapped[int] = mapped_column(Integer)                # "Would I want to do this kind of work every day?"
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CareerChoice(Base):
    """The one career the student says they would opt for after comparing (id = 1). Their own decision, recorded with their reason."""
    __tablename__ = "career_choice"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    career: Mapped[str] = mapped_column(String(32), default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
