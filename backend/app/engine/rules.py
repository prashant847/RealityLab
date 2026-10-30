"""Conditions, effects and the seeded RNG: the primitives scenario content is built from."""
from __future__ import annotations

import hashlib
import operator
from dataclasses import dataclass, field
from typing import Any

from .state import PERCENT_FIELDS, WorldState

_OPS = {
    "==": operator.eq, "!=": operator.ne, "<": operator.lt,
    "<=": operator.le, ">": operator.gt, ">=": operator.ge,
}


def read(state: WorldState, key: str) -> Any:
    if key.startswith("trust."):
        return state.trust[key[6:]]
    return getattr(state, key)


def write(state: WorldState, key: str, value: Any) -> None:
    if key.startswith("trust."):
        state.trust[key[6:]] = value
    else:
        setattr(state, key, value)


@dataclass(frozen=True)
class Cond:
    key: str
    op: str
    value: Any = None

    def test(self, state: WorldState) -> bool:
        if self.op == "has":
            return self.value in state.flags
        if self.op == "lacks":
            return self.value not in state.flags
        return _OPS[self.op](read(state, self.key), self.value)


def has(flag: str) -> Cond: return Cond("flags", "has", flag)
def lacks(flag: str) -> Cond: return Cond("flags", "lacks", flag)
def eq(key: str, v: Any) -> Cond: return Cond(key, "==", v)
def ne(key: str, v: Any) -> Cond: return Cond(key, "!=", v)
def lt(key: str, v: Any) -> Cond: return Cond(key, "<", v)
def gt(key: str, v: Any) -> Cond: return Cond(key, ">", v)
def gte(key: str, v: Any) -> Cond: return Cond(key, ">=", v)


@dataclass(frozen=True)
class Fx:
    """A state change. `when` is evaluated against the state *before* any effect of the
    same decision/event is applied, so effects of one action never see each other."""
    add: dict[str, float] = field(default_factory=dict)
    set: dict[str, Any] = field(default_factory=dict)
    on: tuple[str, ...] = ()
    off: tuple[str, ...] = ()
    when: tuple[Cond, ...] = ()


def clone(state: WorldState) -> WorldState:
    """Cheap copy. Safe because the engine only ever *reassigns* list/dict fields (flags, decisions,
    events, final) and mutates only `trust`, which is copied here."""
    c = state.model_copy()
    c.trust = dict(state.trust)
    return c


def apply_effects(state: WorldState, effects: tuple[Fx, ...]) -> None:
    before = clone(state)
    for fx in effects:
        if not all(c.test(before) for c in fx.when):
            continue
        for k, v in fx.add.items():
            write(state, k, read(state, k) + v)
        for k, v in fx.set.items():
            write(state, k, v)
        for f in fx.on:
            state.add_flag(f)
        for f in fx.off:
            state.remove_flag(f)
    clamp(state)


def clamp(state: WorldState) -> None:
    for f in PERCENT_FIELDS:
        setattr(state, f, int(max(0, min(100, round(getattr(state, f))))))
    for k in state.trust:
        state.trust[k] = int(max(0, min(100, round(state.trust[k]))))
    state.budget = round(max(0.0, state.budget), 2)
    state.true_units = max(0, int(state.true_units))
    state.verified_units = int(max(0, min(state.true_units, state.verified_units)))
    state.provisional_units = max(0, int(state.provisional_units))
    state.transport_capacity = max(0, int(state.transport_capacity))


def roll(seed: int, key: str) -> float:
    """Deterministic uniform [0,1) keyed by (seed, key). There is no sequential generator
    state, so a restored checkpoint reproduces the same rolls without a replay position."""
    digest = hashlib.sha256(f"{seed}:{key}".encode()).digest()
    return int.from_bytes(digest[:8], "big") / 2**64
