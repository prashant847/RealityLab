from app.engine import apply_decision, new_simulation


def play(choice_ids, seed=1):
    """Apply choices in order; return (final_state, outcomes)."""
    s = new_simulation(seed, simulation_id="test")
    outcomes = []
    for cid in choice_ids:
        s, o = apply_decision(s, cid)
        outcomes.append(o)
    return s, outcomes


CAUTIOUS = ["r1_isolate", "r2_evacuate", "r3_alt_transport", "r4_pause", "r5_logistics",
            "r6_restrict", "r7_hospital_first", "r8_suspend", "r9_holding", "r10_sweep"]
RISKY = ["r1_rush", "r2_maintain", "r3_reserve_hospital", "r4_provisional", "r5_negotiated",
         "r6_parallel", "r7_commitments", "r8_transfer", "r9_wait", "r10_provisional"]
