"""Dump real API views to frontend/src/fixtures/views.json (used by the gallery and UI tests).

Run from backend/:  .venv\\Scripts\\python tools\\dump_fixtures.py
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app.db.session import make_engine, make_session_factory  # noqa: E402
from app.services.simulations import SimulationService  # noqa: E402

CAUTIOUS = ["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_pause", "r5_logistics",
            "r6_restrict", "r7_hospital_first", "r8_suspend", "r9_holding", "r10_sweep"]
FAST_RISKY = ["r1_rush", "r2_secure", "r3_alt_transport", "r4_release_verified", "r5_balanced",
              "r6_parallel", "r7_hospital_first", "r8_restricted", "r9_wait", "r10_verified"]
SOFT = ["r1_isolate", "r2_evacuate", "r3_reserve_hospital", "r4_pause", "r5_minimal"]
HARD = ["r1_isolate", "r2_maintain"]


def play(choices, seed=1):
    svc = SimulationService(make_session_factory(make_engine("sqlite://")))
    view = svc.create(seed=seed)
    sid = view["simulation"]["id"]
    views = [view]
    for c in choices:
        views.append(svc.decide(sid, c))
    return svc, sid, views


out = {}
_, _, cautious = play(CAUTIOUS)
out["rounds"] = cautious                       # views[0] = round 1 ... views[10] = completed
svc0, sid0, _ = play(CAUTIOUS[:1])             # a live simulation at round 2 to collect real advice from every stakeholder
out["advice"] = [svc0.advise(sid0, who) for who in ("kavya", "arjun", "nisha", "raghav", "isha")]
svc1, sid1, _ = play(["r1_isolate", "r2_evacuate", "r3_divert_depot"])
out["advice_unverified"] = svc1.advise(sid1, "raghav")
svcf, sidf, fast = play(FAST_RISKY)
out["completed_partial"] = fast[-1]
out["report"] = svcf.report(sidf)                                  # real scored report of the fast-but-risky run
out["checkpoint"] = svcf.checkpoint_view(sidf, 9)
svcf.replay(sidf, 9, ["r10_sweep"])
out["compare"] = svcf.compare(sidf)                                # original vs the alternate branch
svcc, sidc, caut = play(CAUTIOUS)
out["report_good"] = svcc.report(sidc)
_, _, hard = play(HARD)
out["dead_end_hard"] = hard[-1]
svc, sid, soft = play(SOFT)
out["dead_end_soft"] = soft[-1]
out["rewound"] = svc.rewind(sid)               # after rewinding the soft dead end

dest = pathlib.Path(__file__).resolve().parents[2] / "frontend" / "src" / "fixtures" / "views.json"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote", dest, f"({dest.stat().st_size // 1024} KB)")
