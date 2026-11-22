"""Employer accounts, the verified shortlist, benchmarks, analytics, the rate limit and the health check."""
from fastapi.testclient import TestClient

from app.factory import create_app
from app.sims.assess import band_of, score_of
from tests.test_sims import _finish, db_url  # noqa: F401

PW = "correct horse battery"


def _employer(c, email="hr@acme.test"):
    r = c.post("/api/employers/register", json={"email": email, "password": PW, "org": "Acme Hiring"})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


def _sealed_code(c, name="Asha Rao", sim="surgery", mode="strong"):
    run, _ = _finish(c, sim, mode)
    return c.post(f"/api/runs/{run}/seal", json={"candidate": name}).json()["code"]


def test_the_score_matches_the_one_on_the_report_page():
    # the circuit run shown as 16 ("Not yet ready") on the report page: 1 weak decision, skills 0, 29 and 57
    rep = {"summary": {"decisions": 1, "strong": 0, "mixed": 0, "weak": 1}, "skills": [{"percent": 0}, {"percent": 29}, {"percent": 57}], "outcome": {"tone": "bad"}}
    assert score_of(rep) == 16 and band_of(16) == ("not-yet", "Not yet ready")
    best = {"summary": {"decisions": 4, "strong": 4, "mixed": 0, "weak": 0}, "skills": [], "outcome": {"tone": "good"}}
    assert score_of(best) == 100 and band_of(100)[0] == "outstanding"
    capped = {**best, "outcome": {"tone": "bad"}}
    assert score_of(capped) == 59


def test_accounts_need_a_good_password_and_do_not_leak(db_url):
    with TestClient(create_app(db_url)) as c:
        assert c.post("/api/employers/register", json={"email": "nope", "password": PW}).status_code == 422
        assert c.post("/api/employers/register", json={"email": "a@b.test", "password": "short"}).status_code == 422
        h = _employer(c)
        assert c.get("/api/employers/me", headers=h).json()["email"] == "hr@acme.test"
        assert c.post("/api/employers/register", json={"email": "HR@acme.test", "password": PW}).status_code == 422   # same email
        assert c.post("/api/employers/login", json={"email": "hr@acme.test", "password": "wrong password"}).status_code == 401
        ok = c.post("/api/employers/login", json={"email": "hr@acme.test", "password": PW}).json()
        assert c.get("/api/employers/me", headers={"Authorization": "Bearer " + ok["token"]}).status_code == 200
        assert c.get("/api/employers/me").status_code == 401
        assert c.get("/api/employers/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401
        c.post("/api/employers/logout", headers=h)
        assert c.get("/api/employers/me", headers=h).status_code == 401


def test_the_shortlist_only_takes_genuine_reports_and_is_private(db_url):
    with TestClient(create_app(db_url)) as c:
        h = _employer(c)
        code = _sealed_code(c)
        assert c.post("/api/employers/shortlist", json={"code": "RL-00000000-00000000"}, headers=h).status_code == 422
        assert c.post("/api/employers/shortlist", json={"code": code}).status_code == 401
        e = c.post("/api/employers/shortlist", json={"code": code}, headers=h).json()
        assert e["candidate"] == "Asha Rao" and e["score"] == 100 and e["band"] == "outstanding" and e["skills"]
        assert c.post("/api/employers/shortlist", json={"code": code.lower()}, headers=h).json()["id"] == e["id"]       # adding twice keeps one
        assert len(c.get("/api/employers/shortlist", headers=h).json()) == 1
        assert c.put(f"/api/employers/shortlist/{e['id']}/note", json={"note": "Call on Monday"}, headers=h).json()["note"] == "Call on Monday"
        other = _employer(c, "other@corp.test")
        assert c.get("/api/employers/shortlist", headers=other).json() == []
        assert c.delete(f"/api/employers/shortlist/{e['id']}", headers=other).status_code == 404
        assert c.delete(f"/api/employers/shortlist/{e['id']}", headers=h).status_code == 200
        assert c.get("/api/employers/shortlist", headers=h).json() == []


def test_shortlist_is_ranked_best_first(db_url):
    with TestClient(create_app(db_url)) as c:
        h = _employer(c)
        weak = _sealed_code(c, "Weak Wes", "surgery", "mixed")
        good = _sealed_code(c, "Good Gita", "surgery", "strong")
        for code in (weak, good):
            assert c.post("/api/employers/shortlist", json={"code": code}, headers=h).status_code == 200
        names = [x["candidate"] for x in c.get("/api/employers/shortlist", headers=h).json()]
        assert names == ["Good Gita", "Weak Wes"]


def test_benchmark_and_analytics(db_url):
    with TestClient(create_app(db_url)) as c:
        v0 = c.get("/api/verify/" + _sealed_code(c)).json()
        assert v0["valid"] and v0["benchmark"]["percentile"] is None and v0["score"] == 100        # too few other attempts to compare
        for _ in range(5):
            _finish(c, "surgery", "mixed")
        v = c.get("/api/verify/" + _sealed_code(c, "Top Tia")).json()
        assert v["benchmark"]["n"] >= 5 and v["benchmark"]["percentile"] is not None
        a = c.get("/api/analytics/surgery").json()
        assert a["attempts"] >= 7 and sum(b["count"] for b in a["distribution"]) == a["attempts"] and a["steps"] and 0 <= a["steps"][0]["strong_rate"] <= 100
        assert c.get("/api/analytics/circuit").json()["attempts"] == 0


def test_codes_cannot_be_guessed_in_bulk(db_url, monkeypatch):
    monkeypatch.setenv("REALITYLAB_RATE_LIMIT", "5")
    with TestClient(create_app(db_url)) as c:
        codes = [c.get("/api/verify/RL-00000000-00000000").status_code for _ in range(7)]
        assert codes[:5] == [200] * 5 and codes[5:] == [429, 429]


def test_health(db_url):
    with TestClient(create_app(db_url)) as c:
        assert c.get("/api/health").json()["status"] == "ok"
