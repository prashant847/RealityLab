import json
from pathlib import Path

import pytest

from app.engine import new_simulation, scene_view
from app.scenario.events import EVENTS
from app.scenario.pages import EFFECTS, PAGES, validate_page
from app.scenario.rounds import ROUNDS

MANIFEST = Path(__file__).resolve().parents[2] / "frontend" / "public" / "assets" / "manifest.json"


@pytest.mark.parametrize("n", range(1, 11))
def test_every_round_has_a_valid_page(n):
    assert validate_page(PAGES[n]) == []


def test_scene_view_carries_the_page():
    v = scene_view(new_simulation(1))
    assert v["page"]["layout"] == "three" and len(v["page"]["panels"]) == 4


def test_validator_rejects_unknown_ids_and_overlong_text():
    bad = {"layout": "single", "panels": [{"id": "x", "environment": "moon_base", "characters": [
        {"id": "kavya", "expression": "furious", "side": "left"}], "effects": ["lasers"],
        "dialogue": [{"speaker": "kavya", "text": "x" * 500, "kind": "speech"}]}]}
    errs = validate_page(bad)
    assert len(errs) == 4


def test_event_assets_are_known_effects():
    assert all(a in EFFECTS for e in EVENTS for a in e.assets)


def test_round_environment_and_characters_match_page_vocabulary():
    for r in ROUNDS.values():
        assert r.environment in {p["environment"] for p in PAGES[r.number]["panels"]}


@pytest.mark.skipif(not MANIFEST.exists(), reason="frontend assets not generated yet")
def test_every_page_asset_exists_in_the_frontend_manifest():
    m = json.loads(MANIFEST.read_text(encoding="utf8"))
    root = MANIFEST.parent
    for page in PAGES.values():
        for p in page["panels"]:
            assert p["environment"] in m["environments"]
            assert (root / m["environments"][p["environment"]]["path"]).exists()
            for c in p["characters"]:
                path = m["characters"][c["id"]]["expressions"][c["expression"]]
                assert (root / path).exists(), path
            for e in p["effects"]:
                assert e in m["effects"]
