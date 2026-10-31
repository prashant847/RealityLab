"""Career Comparison Mode: what each profession is like, on an ordinary day and in a crisis, to be shown next to what the student actually did and felt.

The profiles are written to be fair to every profession (each has real rewards and real costs) and describe the roles as simulated here. They are not
career advice, salary data or a statement about who is suited to what. Importance ratings are 1 (rarely needed) to 5 (central to the work).
"""
from __future__ import annotations

CAREERS: dict[str, dict] = {
    "covid": {
        "title": "Hospital doctor", "field": "Medicine and healthcare", "setting": "A district hospital: wards, an emergency department, a pharmacy and stores",
        "tagline": "Caring for individual people, inside a system that is always short of something.",
        "daily": {
            "workday": ["Take handovers and lead ward rounds", "Teach and supervise junior doctors", "Check that stock, beds and rotas will hold", "Talk to worried families", "Argue for resources in meetings"],
            "crisis": ["Decide who is seen first when everyone is unwell", "Create beds, oxygen and protective equipment from almost nothing", "Hold a tired team together", "Tell families hard truths, repeatedly"],
        },
        "problems": {
            "workday": ["People problems: tired colleagues, anxious juniors, upset relatives", "Small shortages that nobody owns", "Competing priorities between budget and care"],
            "crisis": ["Resource rationing under pressure", "Fatigue and fear in the team", "Ethical choices with no good answer", "Information that changes by the hour"],
        },
        "decisions": {"tempo": [2, 5], "information": [4, 2], "stakes": [3, 5], "reversibility": [4, 2],
                      "text": {"workday": "Many small decisions with time to think and to ask. Most can be corrected tomorrow.", "crisis": "Fast, high-stakes decisions on incomplete information, often with no option that is clearly right."}},
        "pressure": {"workday": 2, "crisis": 5, "text": {"workday": "Steady and human: a full day, mostly kind, sometimes sad.", "crisis": "Intense and sustained: physical exhaustion plus emotional weight."}},
        "communication": {"with": ["Patients and families", "Nurses and junior doctors", "Senior colleagues", "Hospital administrators"],
                          "text": {"workday": "Communication is the job: handovers, explanations, teaching and negotiating.", "crisis": "Clear, honest, repeated communication carries as much weight as any clinical decision."}},
        "skills": {"communication": 5, "teamwork": 5, "prioritization": 5, "ethical_judgment": 5, "decision_making": 4, "risk_management": 3, "problem_solving": 4, "adaptability": 5},
        "rewards": ["Direct, visible impact on people's lives", "Close teams and deep trust", "Always something to learn"],
        "costs": ["Long hours and emotional load", "Difficult, sometimes tragic outcomes", "A system that rarely has enough"],
    },
    "bhopal": {
        "title": "Process safety manager", "field": "Industrial safety and chemical engineering", "setting": "A chemical plant: control room, tanks, walk-rounds, contractors and neighbours",
        "tagline": "Preventing the incident that nobody will ever see, and being believed when you ask for it.",
        "daily": {
            "workday": ["Walk the plant and test alarms and interlocks", "Review permits and handovers", "Handle near-miss reports", "Say no to unsafe shortcuts", "Explain risk to managers and neighbours"],
            "crisis": ["Rebuild the layers of protection under audit pressure", "Decide whether to stop production", "Raise the alarm early when readings are unclear", "Report honestly after something goes wrong"],
        },
        "problems": {
            "workday": ["Technical problems: untested alarms, bypassed safeguards", "Cultural problems: people afraid to report", "Commercial pressure on maintenance and training"],
            "crisis": ["Several safeguards weakened at once", "Production and schedule pressure against safety", "Ambiguous warning signs", "Accountability after an event"],
        },
        "decisions": {"tempo": [2, 4], "information": [3, 2], "stakes": [4, 5], "reversibility": [3, 1],
                      "text": {"workday": "Methodical decisions about tests, permits and priorities, where a firm no costs money today and saves it later.", "crisis": "Decisions where delay is itself a decision, and where the cost of being wrong falls on people outside the fence."}},
        "pressure": {"workday": 2, "crisis": 5, "text": {"workday": "Quiet, steady pressure: being the person who has to ask the awkward question.", "crisis": "Acute, with responsibility for people who are not even aware of the risk."}},
        "communication": {"with": ["Operators and shift supervisors", "Maintenance and contractors", "Head office and finance", "Regulators and the community"],
                          "text": {"workday": "Much of the job is persuading: managers, contractors and neighbours who each want something else.", "crisis": "Warning people early and reporting honestly, when it would be easier not to."}},
        "skills": {"communication": 4, "teamwork": 4, "prioritization": 4, "ethical_judgment": 5, "decision_making": 4, "risk_management": 5, "problem_solving": 4, "adaptability": 3},
        "rewards": ["Preventing harm that never happens", "Technical depth and respect from operators", "Clear purpose"],
        "costs": ["Success is invisible", "Being the person who says no", "Carrying responsibility for rare, severe events"],
    },
    "blackout": {
        "title": "Operations and incident-response lead", "field": "Logistics, IT operations and cybersecurity", "setting": "A container terminal: gates, yard, server room and customer desk",
        "tagline": "Keeping a complicated system moving, and rebuilding it when it stops.",
        "daily": {
            "workday": ["Run the morning briefing and plan the day", "Decide on patching, backups and maintenance windows", "Keep customers and suppliers informed", "Rehearse the bad day", "Fund unglamorous resilience work"],
            "crisis": ["Contain a spreading failure and keep the evidence", "Decide where limited recovery effort goes", "Run the business on paper and phones", "Tell customers and the public the truth"],
        },
        "problems": {
            "workday": ["Trade-offs between schedule and maintenance", "Hidden single points of failure", "Work that has no visible benefit until it matters"],
            "crisis": ["Cascading system failure", "Unreliable records and unknown stock", "Competing customers and a deadline", "Staff safety while working manually"],
        },
        "decisions": {"tempo": [3, 5], "information": [4, 1], "stakes": [3, 4], "reversibility": [4, 2],
                      "text": {"workday": "Planning decisions with real trade-offs between speed today and resilience tomorrow.", "crisis": "Hard calls with little verified information, where every action costs time you do not have."}},
        "pressure": {"workday": 3, "crisis": 5, "text": {"workday": "Constant tempo: queues, deadlines, customers.", "crisis": "Relentless: a deadline, an unknown cause and many people waiting on you."}},
        "communication": {"with": ["IT and network engineers", "Terminal supervisors and gate staff", "Customers and suppliers", "Senior management and the press"],
                          "text": {"workday": "Translating between technical people and operations, and keeping partners informed.", "crisis": "Frequent, honest updates under uncertainty; saying what you do not yet know."}},
        "skills": {"communication": 4, "teamwork": 4, "prioritization": 5, "ethical_judgment": 3, "decision_making": 5, "risk_management": 5, "problem_solving": 5, "adaptability": 5},
        "rewards": ["Seeing a complex system run well", "Variety: technology, people and logistics", "Being the calm person in a bad moment"],
        "costs": ["Pager-style, on-call responsibility", "Invisible success and visible failure", "Long recovery work after incidents"],
    },
}

SKILL_LABELS = {"decision_making": "Decision-making", "problem_solving": "Problem-solving", "communication": "Communication", "prioritization": "Prioritization",
                "teamwork": "Teamwork", "risk_management": "Risk management", "ethical_judgment": "Ethical judgment", "adaptability": "Adaptability"}
DIMENSIONS = (("daily", "Daily responsibilities"), ("problems", "Types of problems"), ("decisions", "Decision-making"), ("pressure", "Workplace pressure"),
              ("communication", "Communication and teamwork"), ("skills", "Skills required"))
