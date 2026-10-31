"""COVID-era hospital: a fictional district hospital during a surge. The student is the Duty Medical Lead.

Educational only. All patients, staff and the hospital are fictional. Decisions are about systems, priorities, communication, staff and
resources. The simulation gives no clinical treatment advice and is not medical training."""
from __future__ import annotations

from .engine import Choice as C, Ending, Event, Meter, Round, Scenario

PART = "Riverside District Hospital (fictional)"


def _r(id, title, clock, brief, question, facts, strong, mixed, weak, scene):
    """Each option: (label, summary, consequence, effects, flags, skills, lesson)."""
    def mk(rating, o):
        return C(f"{id}_{rating}", o[0], o[1], o[2], rating, o[3], o[4], skills=o[5], lesson=o[6])
    return Round(id, title, clock, "hypothetical", brief, question, tuple(facts),
                 (mk("strong", strong), mk("mixed", mixed), mk("weak", weak)), PART, scene)


ROUNDS = (
    _r("c1", "The first surge", "Day 3 · 07:30",
       "You are the Duty Medical Lead. Overnight, admissions doubled. Information about the new illness changes by the hour.",
       "Patients are arriving faster than your team can assess them. How do you organise who is seen first?",
       ["The emergency department has 31 people waiting, with a mix of mild and severe breathing difficulty.",
        "Guidance from health authorities is still changing. Your team is anxious and some are new to this."],
       ("Set up a structured triage process using agreed criteria, name a triage lead per shift, and brief the team on what is known and unknown",
        "Takes the first hour to organise.", "Patients are sorted in a consistent way, and staff know who decides. The team is steadier.",
        {"care": 8, "wellbeing": 5, "capacity": 3}, ("structured_triage",),
        {"prioritization": 2, "teamwork": 2, "communication": 1, "decision_making": 1}, "Agree a method before the pressure peaks; consistency is fairer and calmer."),
       ("Have the most senior doctor on shift triage case by case", "Fast, but depends on one person.",
        "The queue moves, but decisions vary and the senior doctor becomes a bottleneck.",
        {"care": 2, "wellbeing": -4}, (), {"prioritization": 1, "decision_making": 1}, "Relying on one person's judgement does not scale or protect them."),
       ("See people in the order they arrive", "Simple and seems fair.",
        "Some seriously ill patients wait while milder cases are seen first.",
        {"care": -10, "capacity": -3}, ("first_come",), {"prioritization": -2}, "Arrival order is easy but ignores urgency.")
       , "triage"),
    _r("c2", "No beds left", "Day 6 · 14:00",
       "The wards are full and the intensive care unit is nearly full. Admissions keep coming.",
       "How do you create capacity?",
       ["The hospital has a neighbouring hospital with some free beds, and a closed outpatient wing that could be reopened.",
        "Stable patients could be monitored at home or in a lower-level area if the right checks are in place."],
       ("Reopen the outpatient wing as a monitored step-down area, move stable patients there with clear criteria, and coordinate transfers with the neighbouring hospital",
        "Needs staff and effort.", "Space opens for the sickest. Transfers and moves are planned and recorded.",
        {"capacity": 22, "wellbeing": -4, "care": 4}, ("expanded",), {"problem_solving": 2, "teamwork": 1, "decision_making": 1},
        "Expand and coordinate before refusing care."),
       ("Reopen the wing but staff it by pulling nurses from existing wards", "Fast but thins other wards.",
        "Capacity rises, but the wards from which staff were taken become unsafe.",
        {"capacity": 12, "wellbeing": -10, "care": -3}, (), {"problem_solving": 1, "teamwork": -1}, "Moving staff without backfill shifts the problem."),
       ("Stop admitting new patients until beds free up", "Avoids overload.",
        "People who needed help are turned away. Trust takes a hit.",
        {"capacity": 5, "care": -10, "trust": -12}, ("turned_away",), {"ethical_judgment": -2, "problem_solving": -1, "teamwork": -2}, "Refusing care should be the last resort, not the first.")
       , "capacity"),
    _r("c3", "Protective equipment is running low", "Day 8 · 09:00",
       "Masks and gowns are being used faster than they arrive.",
       "How do you protect staff when supplies are short?",
       ["The next delivery is uncertain. Staff are starting to reuse items in ways the team has not agreed.",
        "A local trader offers cheap equipment with no safety certification."],
       ("Set a written protection plan with the infection control team (use priority by risk area), track stock daily and refuse uncertified equipment", "Requires discipline.",
        "Staff know what to use, where. Stock is tracked, and no unsafe equipment enters.",
        {"ppe": 15, "wellbeing": 5, "trust": 3}, ("ppe_plan",), {"risk_management": 2, "teamwork": 1, "ethical_judgment": 1},
        "Rationing should be planned, written and based on risk."),
       ("Leave it to each ward to decide how to use what they have", "Local flexibility.",
        "Wards manage differently. Some staff are better protected than others.",
        {"ppe": 3, "wellbeing": -5}, (), {"risk_management": 0, "teamwork": -1}, "Without shared rules, protection becomes uneven."),
       ("Buy the uncertified equipment to keep wards stocked", "Solves the shortage on paper.",
        "Staff discover that some masks do not fit properly. Confidence drops.",
        {"ppe": -8, "wellbeing": -10, "trust": -5}, ("bad_ppe",), {"risk_management": -2, "ethical_judgment": -1, "teamwork": -2}, "Unverified protection can be worse than none because people trust it.")
       , "ppe"),
    _r("c4", "Oxygen supply", "Day 10 · 16:30",
       "Demand for oxygen has risen sharply and the supplier has warned of delays.",
       "What do you do about oxygen?",
       ["Some use is higher than needed because flow is not checked. The hospital's reserve is falling.",
        "The district health office tracks supply for the region."],
       ("Audit use, set monitoring so oxygen goes where it is needed, and escalate to the supplier and district office for emergency supply", "Staff time and some friction.",
        "Waste falls and extra supply is arranged earlier than it would have been.",
        {"oxygen": 25, "capacity": 3}, ("oxygen_managed",), {"problem_solving": 2, "communication": 1, "risk_management": 1},
        "Reduce waste and ask early; do not wait for the supply to run out."),
       ("Ask the supplier to hurry and wait", "Single action.",
        "The supplier does what it can. Reserves stay low.",
        {"oxygen": 6}, (), {"communication": 1, "problem_solving": 0}, "A call is a start, not a plan."),
       ("Quietly limit oxygen to the least-sick patients without telling the team", "Hidden rationing.",
        "Oxygen lasts longer but the team finds out. Decisions made without transparency damage trust.",
        {"oxygen": 12, "trust": -12, "care": -8}, ("silent_rationing",), {"ethical_judgment": -2, "communication": -2}, "Hidden rationing is unfair and breaks trust. Rationing should be open and criteria-based.")
       , "oxygen"),
    _r("c5", "One bed, two patients", "Day 12 · 03:20",
       "One intensive care bed is free. Two fictional patients have a similar level of need: a 58-year-old teacher and a 71-year-old retired driver.",
       "How do you decide?",
       ["Both have similar clinical markers. You have no extra beds.",
        "Your hospital has an agreed prioritisation policy, and a senior colleague is on call."],
       ("Apply the hospital's agreed criteria, consult the on-call senior colleague, document the reasons and tell both families honestly", "Takes some minutes.",
        "The decision is consistent and recorded. Both families receive honest explanation.",
        {"care": 6, "trust": 8, "wellbeing": 3}, ("fair_decision",), {"ethical_judgment": 2, "decision_making": 2, "communication": 1},
        "Hard choices need a shared standard, a second view, and honesty."),
       ("Decide alone based on your own judgement of who would benefit most", "Quick.",
        "The decision is made but is hard to explain and rests only on you.",
        {"care": 2, "wellbeing": -6, "trust": -3}, (), {"decision_making": 1, "ethical_judgment": -1}, "Deciding alone with no criteria is a heavy and unfair burden."),
       ("Give the bed to whoever arrived first", "Avoids choosing.",
        "The choice is made by chance and not by need.",
        {"care": -8, "trust": -5}, (), {"ethical_judgment": -2, "decision_making": -1}, "Chance can be a last tiebreaker, but not a substitute for the criteria.")
       , "icu_bed"),
    _r("c6", "Families outside", "Day 14 · 11:00",
       "Visitors are not allowed. Families are calling constantly, and staff are spending hours on the phone.",
       "How do you handle communication with families?",
       ["Families are frightened and often cannot reach the ward.",
        "Staff have little time but want to be kind."],
       ("Create a family liaison role, set scheduled updates, arrange video calls where possible and give honest, plain information", "Needs a person and a schedule.",
        "Families know when they will hear. Staff are freed from constant calls.",
        {"trust": 18, "wellbeing": 4}, ("liaison",), {"communication": 2, "teamwork": 1, "ethical_judgment": 1},
        "Predictable, honest updates reduce fear more than occasional ones."),
       ("Update families when a doctor can spare time", "Flexible.",
        "Some families hear a lot and others nothing. Frustration grows.",
        {"trust": 3, "wellbeing": -4}, (), {"communication": 0}, "Ad hoc updates leave people to chase information."),
       ("Redirect families to the website and stop taking calls", "Protects staff time.",
        "Staff are quieter, but families feel abandoned.",
        {"trust": -15, "wellbeing": 3}, ("cold_comms",), {"communication": -2, "ethical_judgment": -1}, "Efficiency should not mean abandonment.")
       , "family"),
    _r("c7", "Exhaustion", "Day 17 · 06:45",
       "A senior nurse breaks down in tears after a night shift. Many staff have worked double shifts for days.",
       "How do you handle staff fatigue?",
       ["Absence rates are rising. Mistakes are more likely when people are exhausted.",
        "Locum staff and volunteers could be called in but need orientation."],
       ("Introduce mandatory rest rotation, bring in extra staff with a short orientation, and set up peer support", "Short-term cover is stretched.",
        "People rest. Care becomes safer. The team feels seen.",
        {"wellbeing": 22, "capacity": -3, "care": 5}, ("rest_rotation",), {"teamwork": 2, "ethical_judgment": 1, "adaptability": 1},
        "Rest is part of safety, not a luxury."),
       ("Thank staff publicly and ask them to push through", "Cheap.",
        "Morale lifts briefly. Fatigue continues.",
        {"wellbeing": -6, "care": -3}, (), {"teamwork": 0, "adaptability": -1}, "Gratitude does not replace rest."),
       ("Tell staff that absence will be treated as a performance problem", "Pressure.",
        "Some staff hide illness. Trust collapses.",
        {"wellbeing": -18, "care": -8, "trust": -4}, ("blamed_staff",), {"teamwork": -2, "ethical_judgment": -2, "adaptability": -2}, "Punishing exhaustion makes people hide it.")
       , "staff"),
    _r("c8", "After the peak", "Day 24 · 15:00",
       "Cases are falling. The hospital has time to reflect and prepare for the next wave.",
       "How do you use this window?",
       ["The team is tired but there is energy to improve.",
        "Some leaders want to return to normal operations quickly."],
       ("Run a structured debrief, update protocols from what worked and failed, share the lessons with neighbouring hospitals and plan recovery time", "Takes effort now.",
        "The team is better prepared and neighbours benefit as well.",
        {"care": 6, "wellbeing": 8, "trust": 5}, ("debrief",), {"teamwork": 2, "adaptability": 2, "communication": 1},
        "Learning is part of the work, and is shared more widely when it can be."),
       ("Hold a short thank-you meeting and go back to normal", "Light.",
        "Staff feel acknowledged but nothing changes.",
        {"wellbeing": 3}, (), {"adaptability": 0}, "Without learning, the next surge starts from the same place."),
       ("Move on and avoid talking about the hard weeks", "Avoids pain.",
        "The team has no chance to process what happened.",
        {"wellbeing": -8, "trust": -3}, (), {"adaptability": -2, "teamwork": -1}, "Avoiding reflection leaves the same problems in place.")
       , "debrief"),
)

METERS = (
    Meter("capacity", "Bed capacity headroom", 55, "high", "How much room the hospital has to admit more patients."),
    Meter("oxygen", "Oxygen reserve", 65, "high", "Days of oxygen supply in reserve, as a percentage."),
    Meter("ppe", "Protective equipment", 55, "high", "Stock and discipline of protective equipment."),
    Meter("wellbeing", "Staff wellbeing", 75, "high", "Rest, morale and the ability to keep working safely."),
    Meter("care", "Quality of care", 75, "high", "Consistency and safety of patient care."),
    Meter("trust", "Family and community trust", 70, "high", "Whether people feel informed and treated fairly."),
)

EVENTS = (
    Event("ev_corridor", 3, "Patients wait in corridors", "With the wards full, patients are being assessed in corridors. Staff are stretched and privacy is lost.",
          (("lt", "capacity", 45),), {"care": -5, "wellbeing": -5}),
    Event("ev_infect", 4, "Staff infections rise", "Three nurses test positive and have to isolate. The ward is short for the next shifts.",
          (("lt", "ppe", 50),), {"wellbeing": -8, "capacity": -5}),
    Event("ev_supplier", 5, "Supplier delay", "The oxygen supplier announces a further delay of two days.",
          (("lt", "oxygen", 50),), {"oxygen": -10}),
    Event("ev_rationing", 6, "Families hear about the rationing", "A family learns that oxygen was restricted without explanation. They speak to the press.",
          (("flag", "silent_rationing"),), {"trust": -10}),
    Event("ev_sick", 7, "Sick leave increases", "Two experienced staff go on sick leave after repeated double shifts.",
          (("lt", "wellbeing", 50),), {"capacity": -6, "care": -4}),
    Event("ev_review", 8, "Your triage record is reviewed", "The district office reviews your records. The clear criteria and documentation are praised.",
          (("flag", "structured_triage"),), {"trust": 5}),
)

ENDINGS = (
    Ending("held", "The hospital held", "Care stayed consistent, the team stayed standing, and families trusted what they were told. It was hard, and it was handled with structure and honesty.",
           (("gte", "care", 65), ("gte", "wellbeing", 55), ("gte", "trust", 60)), "good"),
    Ending("strained", "Strained but functioning", "The hospital kept going but at a cost: gaps in care, staff stretched or trust damaged. Some of those costs came from choices that could have been different.",
           (("gte", "care", 40),), "neutral"),
    Ending("overwhelmed", "Overwhelmed", "Care, staff and trust all suffered. The simulation shows how pressure and hidden shortcuts feed one another.", (), "bad"),
)

COVID = Scenario(
    id="covid", title="COVID-era Hospital: The Duty Medical Lead",
    tagline="Experience the pressure, responsibility and teamwork of healthcare in a crisis.",
    role="Duty Medical Lead at a fictional district hospital", domain="Medicine · Healthcare management · Public health",
    minutes=20,
    description="Eight decisions over about three weeks in a fictional hospital during a pandemic surge, covering triage, capacity, equipment, oxygen, communication and staff.",
    objectives=("Understand the pressures on doctors and healthcare teams during a major health crisis.",
                "Practise prioritising and communicating when resources are limited and information keeps changing.",
                "See how staff wellbeing, honesty and teamwork affect care."),
    intro=("You are the Duty Medical Lead of a fictional district hospital. Over about three weeks you will make eight decisions.",
           "Everything here is fictional: the hospital, the staff and the patients. The decisions are about organisation, priorities, communication and staff.",
           "This is not medical training and gives no treatment advice. Real clinical decisions need proper education, supervision and professional guidance."),
    disclaimer="Educational simulation only. It is not a substitute for medical education, clinical supervision or professional guidance. All patients and staff are fictional.",
    meters=METERS, rounds=ROUNDS, events=EVENTS, endings=ENDINGS,
    lessons=("Agree criteria before the peak; consistent, documented decisions are fairer and easier to defend.",
             "Be open about shortages: hidden rationing breaks trust faster than the shortage does.",
             "Staff rest and support are part of patient safety.",
             "Predictable, honest communication with families matters as much as speed.",
             "Learning and sharing after a surge prepares the next team."),
    next_up=("bhopal", "blackout"),
)
