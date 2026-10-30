import json

import pytest
from fastapi.testclient import TestClient

from app.db.models import StakeholderInteraction
from app.db.session import make_engine, make_session_factory
from app.engine import apply_decision, new_simulation
from app.engine.state import HIDDEN_FIELDS
from app.factory import create_app
from app.services.simulations import BadRequest, Conflict, SimulationService
from app.stakeholders import llm
from app.stakeholders.agents import AGENTS, STAKEHOLDER_IDS
from app.stakeholders.dialogue import compose, compose_reaction
from app.stakeholders.llm import (AnthropicProvider, Invalid, LLMConfig, Voice, allowed_numbers, build_context,
                                  config_from_env, parse_and_validate, provider_from_env)
from app.stakeholders.policy import build_core

from .helpers import CAUTIOUS, RISKY, play

# ----------------------------------------------------------------------------- helpers
def cores(state, previous=None):
    return {a: build_core(a, state, previous) for a in STAKEHOLDER_IDS}


def states_along(path, seed=1):
    s = new_simulation(seed, "t")
    out = []
    for cid in path:
        out.append(s)
        s, _ = apply_decision(s, cid)
    return out


class FakeProvider:
    def __init__(self, reply=None, exc=None):
        self.reply, self.exc, self.calls = reply, exc, []

    def complete(self, system, user):
        self.calls.append((system, user))
        if self.exc:
            raise self.exc
        return self.reply(user) if callable(self.reply) else self.reply


def good_reply(user):
    ctx = json.loads(user)
    return json.dumps({"dialogue": f"{ctx['draft'][:200]}".replace("“", "'").replace("”", "'")})


@pytest.fixture()
def svc():
    return SimulationService(make_session_factory(make_engine("sqlite://")))


def mk(svc, choices=()):
    sid = svc.create(seed=1)["simulation"]["id"]
    for c in choices:
        svc.decide(sid, c)
    return sid


# ----------------------------------------------------------------------------- agents
def test_five_distinct_agents_with_goals_constraints_and_styles():
    assert STAKEHOLDER_IDS == ("kavya", "arjun", "nisha", "raghav", "isha")
    assert len({a.style for a in AGENTS.values()}) == 5 and len({tuple(a.goals) for a in AGENTS.values()}) == 5
    for a in AGENTS.values():
        assert a.goals and a.constraints and a.agrees_when and a.disagrees_when and a.weights and a.facts


def test_agents_never_all_agree_and_disagree_in_most_rounds_of_the_main_paths():
    for path in (CAUTIOUS, RISKY):
        disagreements = 0
        for s in states_along(path):
            c = cores(s)
            recs = [x["recommendation"] for x in c.values() if x["recommendation"]]
            opposes = {st["choice_id"] for x in c.values() for st in x["stances"] if st["verdict"] == "oppose"}
            assert not (len(recs) == 5 and len(set(recs)) == 1), f"round {s.round}: unanimous"
            if len(set(recs)) > 1 or (set(recs) & opposes) or opposes:
                disagreements += 1
        assert disagreements >= 7, f"only {disagreements} of 10 rounds had any disagreement"


def test_opening_round_split_reflects_each_agents_priorities():
    c = cores(new_simulation(1))
    assert c["arjun"]["recommendation"] == "r1_isolate" and c["nisha"]["recommendation"] == "r1_isolate"
    assert c["raghav"]["recommendation"] == "r1_rush"                      # time over evidence
    assert any(st["choice_id"] == "r1_rush" and st["verdict"] == "oppose" for st in c["arjun"]["stances"])
    assert any(st["choice_id"] == "r1_isolate" and st["verdict"] == "oppose" for st in c["raghav"]["stances"])


def test_hospital_priority_split_between_isha_and_nisha():
    s, _ = play(CAUTIOUS[:6])
    c = cores(s)
    assert c["isha"]["recommendation"] == "r7_hospital_first"
    assert c["nisha"]["recommendation"] == "r7_commitments"
    stance = {st["choice_id"]: st for st in c["isha"]["stances"]}
    assert stance["r7_commitments"]["vetoed"] and "patients" in stance["r7_commitments"]["reasons"][0]


def test_hard_constraints_are_vetoes_with_reasons():
    s2, _ = play(["r1_isolate"])
    for a in STAKEHOLDER_IDS:                                              # nobody recommends skipping procedure
        st = {x["choice_id"]: x for x in build_core(a, s2)["stances"]}["r2_maintain"]
        assert st["vetoed"] and st["verdict"] == "oppose" and "emergency procedure" in st["reasons"][0]
        assert build_core(a, s2)["recommendation"] != "r2_maintain"
    s1 = new_simulation(1)
    arjun = {x["choice_id"]: x for x in build_core("arjun", s1)["stances"]}["r1_rush"]
    assert arjun["vetoed"] and "containment" in arjun["reasons"][0]
    s5, _ = play(["r1_controlled", "r2_secure", "r3_divert_depot", "r4_release_verified"])
    nisha = {x["choice_id"]: x for x in build_core("nisha", s5)["stances"]}["r5_restoration"]
    assert nisha["vetoed"] and "contingencies" in nisha["reasons"][0]


def test_no_advisor_ever_recommends_an_unsafe_action_anywhere():
    for path in (CAUTIOUS, RISKY):
        for s in states_along(path):
            for a in STAKEHOLDER_IDS:
                assert build_core(a, s)["recommendation"] != "r2_maintain"


# ----------------------------------------------------------------------------- reactions
def test_kavya_challenges_unsafe_decisions_and_agrees_with_safe_ones():
    before, _ = play(["r1_isolate"])
    unsafe, _ = apply_decision(before, "r2_maintain")
    rx = build_core("kavya", unsafe, (before, "r2_maintain"))["reaction"]
    assert rx["verdict"] == "challenge" and "emergency procedure" in rx["why"]
    safe, _ = apply_decision(before, "r2_evacuate")
    assert build_core("kavya", safe, (before, "r2_evacuate"))["reaction"]["verdict"] == "agree"
    core = build_core("kavya", unsafe, (before, "r2_maintain"))
    assert compose_reaction(core, 1).startswith(("I have to say I disagreed", "I'd have chosen differently"))


def test_reaction_judges_with_the_information_available_at_the_time():
    before, _ = play(CAUTIOUS[:4])
    after, _ = apply_decision(before, "r5_restoration") if False else apply_decision(before, "r5_logistics")
    rx = build_core("nisha", after, (before, "r5_logistics"))["reaction"]
    # Nisha's verdict is computed against `before` (budget then), not against what happened afterwards
    assert rx["choice_id"] == "r5_logistics" and rx["verdict"] in ("challenge", "mixed")
    assert build_core("nisha", new_simulation(1))["reaction"] is None


# ----------------------------------------------------------------------------- imperfect / private info
def test_raghav_gives_optimistic_unverified_capacity_until_the_depot_is_confirmed():
    s, _ = play(["r1_isolate", "r2_evacuate", "r3_divert_depot"])
    priv = build_core("raghav", s)["private"][0]
    assert not priv["verified"] and priv["reliability"] <= 0.5
    assert f"{s.transport_capacity + 25} units" in priv["text"] and "verify" in priv["text"].lower()
    assert s.transport_capacity + 25 != s.transport_capacity                 # his figure differs from the HUD
    s2, _ = play(["r1_isolate", "r2_evacuate", "r3_divert_depot", "r4_pause", "r5_logistics"])
    priv2 = build_core("raghav", s2)["private"][0]
    assert priv2["verified"] and f"{s2.transport_capacity} units" in priv2["text"]


def test_arjun_never_attributes_blame_and_hedges_when_evidence_is_poor():
    s, _ = play(CAUTIOUS[:5])
    for st in (s, play(["r1_rush", "r2_secure", "r3_alt_transport", "r4_provisional", "r5_minimal"])[0]):
        text = compose(build_core("arjun", st), 1).lower()
        assert not any(w in text for w in ("hacked", "attacker", "caused by", "responsible for", "culprit"))
    poor, _ = play(["r1_rush", "r2_secure", "r3_alt_transport", "r4_provisional", "r5_minimal"])
    core = build_core("arjun", poor)
    assert core["confidence"] < 55 and core["uncertainty"] and "firm" in core["private"][0]["text"]
    assert "Take that with caution" in compose(core, 1)


def test_nisha_reports_committed_obligations_exactly():
    s, _ = play(["r1_isolate", "r2_evacuate", "r3_divert_depot", "r4_pause", "r5_negotiated"])
    texts = " ".join(p["text"] for p in build_core("nisha", s)["private"])
    assert "₹2.0 lakh invoice" in texts and "genuinely free" in texts


def test_kavya_warns_privately_about_an_unassessed_hazard():
    from app.engine.state import WorldState
    s = WorldState(seed=1, round=3)
    s.add_flag("unsafe_ops")
    assert "unassessed" in build_core("kavya", s)["private"][0]["text"]


# ----------------------------------------------------------------------------- safety of the information
def test_advice_never_leaks_hidden_ground_truth():
    for s in states_along(CAUTIOUS):
        blob = json.dumps([build_core(a, s) for a in STAKEHOLDER_IDS] + [compose(build_core(a, s), 1) for a in STAKEHOLDER_IDS])
        for field in HIDDEN_FIELDS:
            assert field not in blob
        assert f'"{s.true_units}"' not in blob and f" {s.true_units} units" not in blob


def test_advice_is_deterministic_and_does_not_change_the_world():
    s, _ = play(CAUTIOUS[:3])
    before = s.model_dump()
    a = [build_core(x, s) for x in STAKEHOLDER_IDS]
    b = [build_core(x, s) for x in STAKEHOLDER_IDS]
    assert a == b and [compose(c, 1) for c in a] == [compose(c, 1) for c in b]
    assert s.model_dump() == before


def test_dialogue_variants_are_stable_per_seed_and_stay_in_voice():
    s = new_simulation(1)
    assert compose(build_core("kavya", s), 5) == compose(build_core("kavya", s), 5)
    s2, _ = play(["r1_isolate"])
    assert compose(build_core("nisha", s2), 1).split(".")[0] in ("Numbers first", "Let me put this in rupees")


# ----------------------------------------------------------------------------- LLM adapter
def test_llm_disabled_without_a_key_or_when_switched_off():
    assert config_from_env({}) is None and provider_from_env({}) is None
    assert config_from_env({"ANTHROPIC_API_KEY": "k", "REALITYLAB_LLM": "off"}) is None
    cfg = config_from_env({"ANTHROPIC_API_KEY": "k", "REALITYLAB_LLM_TIMEOUT": "nonsense"})
    assert cfg and cfg.timeout == 8.0 and cfg.model == "claude-haiku-5-5"
    assert config_from_env({"REALITYLAB_LLM_KEY": "z", "REALITYLAB_LLM_MODEL": "m"}).model == "m"
    assert config_from_env({"ANTHROPIC_API_KEY": "k"}).url == "https://api.anthropic.com/v1/messages"
    assert config_from_env({"ANTHROPIC_API_KEY": "k", "REALITYLAB_LLM_URL": "http://127.0.0.1:9/x"}).url == "http://127.0.0.1:9/x"


def test_valid_llm_output_is_used_but_cannot_change_the_structured_advice():
    s = new_simulation(1)
    core = build_core("kavya", s)
    p = FakeProvider(good_reply)
    text, source, note = Voice(p).speak(core, compose(core, 1))
    assert source == "llm" and note is None and len(p.calls) == 1
    assert core == build_core("kavya", s)                                    # the structured core is untouched


@pytest.mark.parametrize("reply,why", [
    ("not json at all", "no_json"), ('{"dialogue": oops}', "bad_json"), ('{"dialogue": 5}', "schema"),
    ('{"dialogue": "ok enough text here to pass length", "extra": 1}', "schema"), ('{"dialogue": "short"}', "length"),
    (json.dumps({"dialogue": "x" * 500}), "length"),
    (json.dumps({"dialogue": "Evacuate now <script>alert(1)</script> please everyone listen"}), "forbidden_content"),
    (json.dumps({"dialogue": "See https://evil.example for the plan, everyone please read"}), "forbidden_content"),
    (json.dumps({"dialogue": "The logs prove it was hacked by the supplier, I am sure of it"}), "forbidden_content"),
    (json.dumps({"dialogue": "We should spend 9.5 lakh on this right now, trust me on that"}), "invented_number:9.5"),
])
def test_invalid_llm_output_falls_back_to_the_deterministic_text(reply, why):
    core = build_core("nisha", new_simulation(1))
    draft = compose(core, 1)
    text, source, note = Voice(FakeProvider(reply)).speak(core, draft)
    assert (text, source) == (draft, "policy") and note == f"llm_rejected:{why}"


@pytest.mark.parametrize("exc", [TimeoutError("slow"), ConnectionError("down"), RuntimeError("boom"), KeyError("x")])
def test_llm_errors_never_break_the_game(exc):
    core = build_core("isha", new_simulation(1))
    draft = compose(core, 1)
    text, source, note = Voice(FakeProvider(exc=exc)).speak(core, draft)
    assert (text, source) == (draft, "policy") and note == f"llm_unavailable:{type(exc).__name__}"


def test_what_the_model_is_sent_contains_no_hidden_or_foreign_data():
    s, _ = play(CAUTIOUS[:4])
    core = build_core("arjun", s)
    p = FakeProvider(good_reply)
    Voice(p).speak(core, compose(core, 1))
    system, user = p.calls[0]
    assert "true_units" not in user and f'"{s.true_units}"' not in user
    ctx = json.loads(user)
    assert set(ctx) == {"character", "time", "recommendation", "reasons", "objection", "confidence_percent",
                        "uncertainty", "facts", "own_claims", "draft"}
    assert ctx["character"]["name"] == "Arjun Mehta" and "Kavya" not in user
    assert "never state who is responsible" in system and "ONLY facts and numbers present" in system


def test_numbers_in_model_output_must_come_from_the_context():
    core = build_core("raghav", play(["r1_isolate", "r2_evacuate", "r3_divert_depot"])[0])
    ctx = build_context(core, compose(core, 1))
    ok = allowed_numbers(ctx)
    assert str(core["confidence"]) in ok
    claimed = core["private"][0]["text"].split(" units")[0].split()[-1]
    assert claimed in ok
    assert parse_and_validate(json.dumps({"dialogue": f"I make it about {claimed} units, but please verify the depot first."}), ok)
    with pytest.raises(Invalid):
        parse_and_validate(json.dumps({"dialogue": "I make it about 999 units, but please verify the depot first."}), ok)


def test_anthropic_provider_builds_the_right_request_without_touching_the_network():
    seen = {}

    def transport(req, timeout):
        seen["url"], seen["headers"], seen["body"], seen["timeout"] = req.full_url, dict(req.header_items()), json.loads(req.data), timeout
        return json.dumps({"content": [{"type": "text", "text": '{"dialogue": "hello"}'}]}).encode()

    out = AnthropicProvider(LLMConfig(api_key="sk-test", timeout=3), transport).complete("SYS", "USER")
    assert out == '{"dialogue": "hello"}' and seen["timeout"] == 3
    assert seen["url"] == "https://api.anthropic.com/v1/messages"
    assert seen["headers"]["X-api-key"] == "sk-test" and seen["headers"]["Anthropic-version"] == "2023-06-01"
    assert seen["body"]["system"] == "SYS" and seen["body"]["messages"] == [{"role": "user", "content": "USER"}]
    assert llm.log.name == "realitylab.llm"


# ----------------------------------------------------------------------------- service + persistence
def test_service_advice_is_read_only_cached_and_persisted(svc):
    sid = mk(svc, ["r1_isolate"])
    before = svc.view(sid)["state"]
    a = svc.advise(sid, "kavya")
    assert a["source"] == "policy" and a["cached"] is False and a["round"] == 2
    assert a["reaction"]["choice_id"] == "r1_isolate" and a["reaction_text"]
    b = svc.advise(sid, "kavya")
    assert b["cached"] is True and {**b, "cached": False} == a
    assert svc.view(sid)["state"] == before                                  # asking never changes the world
    with svc.sf() as db:
        assert db.query(StakeholderInteraction).count() == 1
    assert [x["stakeholder"] for x in svc.advice_for_round(sid)] == ["kavya"]
    svc.decide(sid, "r2_evacuate")
    assert svc.advice_for_round(sid) == []                                   # new decision, fresh slate
    assert svc.advise(sid, "kavya")["round"] == 3


def test_model_is_called_once_per_question_and_never_inside_a_write_transaction(svc):
    p = FakeProvider(good_reply)
    s2 = SimulationService(svc.sf, Voice(p))
    sid = mk(s2, ["r1_isolate"])
    assert s2.advise(sid, "arjun")["source"] == "llm"
    assert s2.advise(sid, "arjun")["source"] == "llm" and len(p.calls) == 1   # second ask served from storage


def test_model_failure_still_returns_advice_through_the_service(svc):
    s2 = SimulationService(svc.sf, Voice(FakeProvider(exc=TimeoutError())))
    sid = mk(s2)
    a = s2.advise(sid, "nisha")
    assert a["source"] == "policy" and a["note"] == "llm_unavailable:TimeoutError" and a["dialogue"]


def test_advice_validation_and_state_rules(svc):
    sid = mk(svc)
    with pytest.raises(BadRequest):
        svc.advise(sid, "bob")
    dead = mk(svc, ["r1_isolate", "r2_maintain"])
    with pytest.raises(Conflict):
        svc.advise(dead, "kavya")
    done = mk(svc, CAUTIOUS)
    with pytest.raises(Conflict):
        svc.advise(done, "kavya")


def test_advice_survives_application_restart(tmp_path):
    url = f"sqlite:///{(tmp_path / 'a.db').as_posix()}"
    e1 = make_engine(url)
    s1 = SimulationService(make_session_factory(e1))
    sid = s1.create(seed=1)["simulation"]["id"]
    first = s1.advise(sid, "isha")
    e1.dispose()
    s2 = SimulationService(make_session_factory(make_engine(url)))
    again = s2.advise(sid, "isha")
    assert again["cached"] is True and again["dialogue"] == first["dialogue"]


def test_rewound_branch_gets_its_own_advice(svc):
    sid = mk(svc, ["r1_isolate", "r2_evacuate"])
    svc.advise(sid, "kavya")
    svc.rewind(sid, checkpoint_index=1)
    assert svc.advice_for_round(sid) == []
    assert svc.advise(sid, "kavya")["cached"] is False


# ----------------------------------------------------------------------------- API
@pytest.fixture()
def client():
    with TestClient(create_app("sqlite://", voice=Voice(None))) as c:
        yield c


def test_api_advice_flow_and_validation(client):
    sid = client.post("/api/simulations", json={"seed": 1}).json()["simulation"]["id"]
    r = client.post(f"/api/simulations/{sid}/stakeholder-advice", json={"stakeholder": "raghav"})
    assert r.status_code == 200
    a = r.json()
    assert a["stakeholder"] == "raghav" and a["recommendation"] == "r1_rush" and a["source"] == "policy"
    assert {s["verdict"] for s in a["stances"]} >= {"support", "oppose"}
    assert client.get(f"/api/simulations/{sid}/stakeholder-advice").json()[0]["cached"] is True
    for body in ({"stakeholder": "bob"}, {}, {"stakeholder": "kavya", "x": 1}, {"stakeholder": 3}):
        resp = client.post(f"/api/simulations/{sid}/stakeholder-advice", json=body)
        assert resp.status_code == 422 and resp.json()["error"]["code"] == "validation_error"
    assert client.post("/api/simulations/nope/stakeholder-advice", json={"stakeholder": "kavya"}).status_code == 404
    client.post(f"/api/simulations/{sid}/decisions", json={"choice_id": "r1_isolate"})
    client.post(f"/api/simulations/{sid}/decisions", json={"choice_id": "r2_maintain"})
    assert client.post(f"/api/simulations/{sid}/stakeholder-advice", json={"stakeholder": "kavya"}).status_code == 409


def test_game_is_fully_playable_without_any_key_and_view_has_no_llm_dependency(client, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    sid = client.post("/api/simulations", json={"seed": 2}).json()["simulation"]["id"]
    for who in STAKEHOLDER_IDS:
        assert client.post(f"/api/simulations/{sid}/stakeholder-advice", json={"stakeholder": who}).json()["source"] == "policy"
    for c in CAUTIOUS:
        assert client.post(f"/api/simulations/{sid}/decisions", json={"choice_id": c}).status_code == 200
    assert client.get(f"/api/simulations/{sid}").json()["run"]["ending"] == "full_recovery"
