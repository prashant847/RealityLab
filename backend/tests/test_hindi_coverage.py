"""The Archivist's Hindi narration reads translations of the simulations' own text. If a scenario string is added or changed and not translated,
the Hindi debrief would silently leave that sentence out, so this test fails until the Hindi dictionary has it."""
import json
from pathlib import Path

import pytest

from app.engine.engine import ENDINGS
from app.scenario.events import EVENTS as BO_EVENTS
from app.scenario.rounds import ROUNDS
from app.scoring import rubric
from app.scoring.report import FOCUS, LOSS_FIELDS
from app.sims import engine as E
from app.sims import registry

DEBRIEF = Path(__file__).resolve().parents[2] / "frontend" / "src" / "debrief"


@pytest.fixture(scope="module")
def sims():
    return json.loads((DEBRIEF / "hi-sims.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def blackout():
    return json.loads((DEBRIEF / "hi-blackout.json").read_text(encoding="utf-8"))


def _has_latin(text: str) -> bool:
    return any("a" <= c.lower() <= "z" for c in text)


def test_every_spoken_scenario_string_has_a_hindi_translation(sims):
    missing = []
    for sc in registry.SCENARIOS.values():
        need = [sc.title, sc.role, *[m.label for m in sc.meters], *sc.lessons, *[p.label for p in sc.prep]]
        for r in sc.rounds:
            need.append(r.title)
            for c in r.choices:
                need += [c.label, c.consequence]
        for e in sc.endings:
            need += [e.title, e.text]
        missing += [s for s in need if s and s not in sims]
    missing += [label for label in E.SKILLS.values() if label not in sims]
    assert not missing, f"{len(missing)} scenario strings have no Hindi translation, e.g. {missing[:3]}"


def test_every_blackout_string_the_debrief_speaks_has_a_hindi_translation(blackout):
    need = [r.clock for r in ROUNDS.values()]
    need += [c.label for r in ROUNDS.values() for c in r.choices]
    need += [e.title for e in BO_EVENTS]
    need += [u for u, _ in LOSS_FIELDS.values()]
    for title, text in ENDINGS.values():
        need += [title, text]
    need += [c.name for c in rubric.CATEGORIES] + list(FOCUS.values()) + [f"band:{name}" for _, name in rubric.BANDS]
    need += ["Provisional records overstated cargo", "cargo lots moved on records that did not exist", "Reopen on verified cargo only, or check first"]
    missing = [s for s in need if s not in blackout]
    assert not missing, f"{len(missing)} BLACKOUT strings have no Hindi translation, e.g. {missing[:3]}"


def test_translations_are_hindi_only_so_the_hindi_voice_never_reads_english(sims, blackout):
    bad = [k for k, v in {**sims, **blackout}.items() if _has_latin(v.replace("{n}", ""))]
    assert not bad, f"Latin letters in the Hindi for: {bad[:3]}"
    assert all(v.strip() for v in {**sims, **blackout}.values())
