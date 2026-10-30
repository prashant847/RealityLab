"""Authoritative world state for BLACKOUT. Only the engine mutates it; the LLM never does."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

STAKEHOLDERS = ("kavya", "arjun", "nisha", "raghav", "isha")
LAST_ROUND = 10

# Fields that are clamped to 0..100 after every state change.
PERCENT_FIELDS = (
    "system_integrity", "recovery_progress", "evidence_quality", "staff_safety",
    "labour_pct", "public_trust", "supplier_confidence",
)
# Fields the player cannot see until they are discovered through verification.
HIDDEN_FIELDS = ("true_units",)


class WorldState(BaseModel):
    simulation_id: str = ""
    seed: int = 0
    round: int = 1
    status: Literal["active", "completed"] = "active"

    # Time: minutes of slack left before the 06:00 dispatch can no longer be completed.
    window_min: int = 300

    # Money, in lakh rupees.
    budget: float = 12.0

    # Systems and evidence.
    system_integrity: int = 35
    recovery_progress: int = 0
    evidence_quality: int = 40
    containment: Literal["none", "partial", "full"] = "none"

    # Inventory. recorded_units is what the (unreliable) system claims; true_units is
    # the physical reality, hidden from the player; verified_units is physically confirmed.
    recorded_units: int = 480
    true_units: int = 430
    verified_units: int = 0
    provisional_units: int = 0

    # People and facility.
    staff_safety: int = 100
    labour_pct: int = 100
    facility: Literal["normal", "smoke", "evacuated", "isolated", "hazard", "cleared"] = "normal"

    # Logistics and customers.
    transport_capacity: int = 400
    hospital_need: int = 220
    contract_need: int = 100
    priority: Literal["hospital_first", "contract_first", "split"] = "split"

    # Reputation and relationships.
    public_trust: int = 70
    supplier_confidence: int = 70
    trust: dict[str, int] = Field(default_factory=lambda: {k: 60 for k in STAKEHOLDERS})

    # Qualitative facts (sorted list so snapshots are stable).
    flags: list[str] = Field(default_factory=list)

    # Records.
    decisions: list[dict[str, Any]] = Field(default_factory=list)
    events: list[dict[str, Any]] = Field(default_factory=list)
    round_events: list[dict[str, Any]] = Field(default_factory=list)  # fired on entering this round

    ending: str | None = None
    final: dict[str, Any] | None = None

    def add_flag(self, flag: str) -> None:
        if flag not in self.flags:
            self.flags = sorted([*self.flags, flag])

    def remove_flag(self, flag: str) -> None:
        self.flags = [f for f in self.flags if f != flag]
