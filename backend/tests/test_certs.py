"""Certificates: one per simulation, earned only by the best choice at every step (and, for a career simulation, in both parts)."""
from fastapi.testclient import TestClient

from app.factory import create_app
from tests.test_sims import _finish, db_url  # noqa: F401


def _certs(c):
    return {x["id"]: x for x in c.get("/api/certificates").json()}


def test_nobody_starts_with_a_certificate(db_url):
    with TestClient(create_app(db_url)) as c:
        certs = _certs(c)
        assert list(certs) == ["blackout", "bhopal", "covid", "circuit", "surgery"]
        assert not any(x["earned"] for x in certs.values())
        assert len(certs["covid"]["parts"]) == 2 and len(certs["circuit"]["parts"]) == 1


def test_a_lab_certificate_needs_every_step_correct(db_url):
    with TestClient(create_app(db_url)) as c:
        _finish(c, "surgery", "mixed")                       # fails at step 1
        assert not _certs(c)["surgery"]["earned"]
        run, _ = _finish(c, "surgery", "strong")
        cert = _certs(c)["surgery"]
        assert cert["earned"] and cert["earned_at"] and cert["number"].startswith("RL-SUR-") and cert["run_ids"] == [run]
        assert not _certs(c)["circuit"]["earned"]


def test_a_career_certificate_needs_both_parts_at_their_best(db_url):
    with TestClient(create_app(db_url)) as c:
        _finish(c, "covid_workday", "strong")
        part = _certs(c)["covid"]
        assert not part["earned"] and [p["met"] for p in part["parts"]] == [True, False]
        _finish(c, "covid", "mixed")                         # a weaker crisis does not count
        assert not _certs(c)["covid"]["earned"]
        _finish(c, "covid", "strong")
        cert = _certs(c)["covid"]
        assert cert["earned"] and all(p["met"] for p in cert["parts"])
        assert not _certs(c)["bhopal"]["earned"]
