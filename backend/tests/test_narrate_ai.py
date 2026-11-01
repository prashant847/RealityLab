import json

import pytest
from fastapi.testclient import TestClient

from app.factory import create_app
from app.sims import narrate_ai

SCENES = [
    {"id": "open", "chapter": "The first night", "mood": "calm", "facts": ["You cut the affected connections and kept the evidence.", "It cost 0.5 effort points and 40 minutes."]},
    {"id": "close", "chapter": "What to take away", "mood": "warm", "facts": ["A stronger option was to recover in stages."]},
]
GOOD = {"scenes": [
    {"id": "open", "lines": ["You closed the doors first, and that saved the evidence.", "It cost you 40 minutes and 0.5 effort points, which is a fair price for a clean record."]},
    {"id": "close", "lines": ["Turn the page and keep this: recovering in stages was the stronger way."]},
]}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("REALITYLAB_DB", f"sqlite:///{tmp_path / 'x.db'}")
    monkeypatch.delenv("REALITYLAB_CLAUDE", raising=False)
    return TestClient(create_app())


def body(**kw):
    return {"scenes": SCENES, "lang": "en", **kw}


def test_a_good_reply_is_accepted_and_cached(client, monkeypatch):
    monkeypatch.setattr(narrate_ai, "enabled", lambda: True)
    calls = []
    monkeypatch.setattr(narrate_ai, "_run_claude", lambda prompt: calls.append(prompt) or "Sure: " + json.dumps(GOOD))
    r = client.post("/api/debrief/narrate", json=body()).json()
    assert r["source"] == "claude" and [s["id"] for s in r["scenes"]] == ["open", "close"]
    assert "old librarian" in calls[0] and "The first night" in calls[0] and "0.5 effort points" in calls[0]
    assert client.post("/api/debrief/narrate", json=body()).json() == r and len(calls) == 1      # the same run is told the same way again
    client.post("/api/debrief/narrate", json=body(fresh=True))
    assert len(calls) == 2                                                                        # unless a new telling is asked for


@pytest.mark.parametrize("reply", [
    "no json here",
    json.dumps({"scenes": [GOOD["scenes"][0]]}),                                                     # a scene is missing
    json.dumps({"scenes": [GOOD["scenes"][0], {"id": "other", "lines": ["A fine long line about nothing at all."]}]}),   # an unknown scene
    json.dumps({"scenes": [{"id": "open", "lines": ["You lost 97 minutes there, said the old man quietly."]}, GOOD["scenes"][1]]}),   # an invented number
    json.dumps({"scenes": [{"id": "open", "lines": ["<b>Bold</b> markup does not belong in speech at all."]}, GOOD["scenes"][1]]}),
    json.dumps({"scenes": [{"id": "open", "lines": ["As an AI I would say you did very well indeed."]}, GOOD["scenes"][1]]}),
    json.dumps({"scenes": [{"id": "open", "lines": ["x " * 400]}, GOOD["scenes"][1]]}),             # far too long
])
def test_a_bad_reply_falls_back_to_the_original_lines(client, monkeypatch, reply):
    monkeypatch.setattr(narrate_ai, "enabled", lambda: True)
    monkeypatch.setattr(narrate_ai, "_run_claude", lambda prompt: reply)
    assert client.post("/api/debrief/narrate", json=body()).json() == {"source": "original", "scenes": []}


def test_without_the_cli_the_original_lines_are_kept(client, monkeypatch):
    monkeypatch.setenv("REALITYLAB_CLAUDE", "off")
    assert client.post("/api/debrief/narrate", json=body()).json()["source"] == "original"
    assert client.get("/api/debrief/narrate/status").json() == {"claude": False}


def test_input_is_validated(client):
    assert client.post("/api/debrief/narrate", json={"scenes": [], "lang": "en"}).status_code == 422
    assert client.post("/api/debrief/narrate", json=body(lang="fr")).status_code == 422
    assert client.post("/api/debrief/narrate", json={"scenes": [{"id": "a", "facts": []}]}).status_code == 422
