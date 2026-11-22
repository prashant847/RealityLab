"""Verifiable reports: a sealed report's code checks out, and any change to the report, the name or the code breaks it."""
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.factory import create_app
from tests.test_sims import _finish, db_url  # noqa: F401


def _sealed(c, name="Asha Rao"):
    run, _ = _finish(c, "surgery", "strong")
    r = c.post(f"/api/runs/{run}/seal", json={"candidate": name})
    assert r.status_code == 200, r.text
    return run, r.json()


def test_a_sealed_report_verifies_and_shows_what_it_says(db_url):
    with TestClient(create_app(db_url)) as c:
        run, seal = _sealed(c)
        assert seal["code"].startswith(f"RL-{run[:8]}-") and seal["candidate"] == "Asha Rao"
        v = c.get(f"/api/verify/{seal['code']}").json()
        assert v["valid"] and v["candidate"] == "Asha Rao" and v["report"]["simulation"] and "seal" not in v["report"]
        assert c.get(f"/api/verify/{seal['code'].lower()}").json()["valid"]          # case does not matter


def test_sealing_twice_keeps_the_first_seal(db_url):
    with TestClient(create_app(db_url)) as c:
        run, first = _sealed(c)
        again = c.post(f"/api/runs/{run}/seal", json={"candidate": "Someone Else"}).json()
        assert again == first
        assert c.get(f"/api/runs/{run}/report").json()["seal"]["code"] == first["code"]


def test_a_changed_report_or_a_made_up_code_does_not_verify(db_url):
    with TestClient(create_app(db_url)) as c:
        run, seal = _sealed(c)
        bad = seal["code"][:-1] + ("0" if seal["code"][-1] != "0" else "1")
        assert c.get(f"/api/verify/{bad}").json()["valid"] is False
        assert c.get("/api/verify/RL-00000000-00000000").json()["valid"] is False
        assert c.get("/api/verify/not-a-code").json()["valid"] is False
        # edit the stored report behind the app's back (a better outcome, a changed name) and the same code must stop verifying
        eng = create_engine(db_url)
        with eng.begin() as cx:
            row = cx.execute(text("select report from sim_runs where id=:i"), {"i": run}).scalar_one()
            cx.execute(text("update sim_runs set report=:r where id=:i"), {"r": row.replace("Asha Rao", "Mallory"), "i": run})
        v = c.get(f"/api/verify/{seal['code']}").json()
        assert v["valid"] is False and "changed" in v["reason"]


def test_a_report_needs_a_name_and_must_be_finished(db_url):
    with TestClient(create_app(db_url)) as c:
        run, _ = _finish(c, "surgery", "strong")
        assert c.post(f"/api/runs/{run}/seal", json={"candidate": "   "}).status_code in (400, 422)
        started = c.post("/api/sims/surgery/runs", json={}).json() if c.post("/api/sims/surgery/runs", json={}).status_code < 300 else None
        if started:
            assert c.post(f"/api/runs/{started['run']['id']}/seal", json={"candidate": "A"}).status_code == 409
