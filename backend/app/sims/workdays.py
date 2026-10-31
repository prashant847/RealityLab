"""Workday scenarios: one ordinary, calm day in each profession, played BEFORE the crisis simulation.

Nothing here is an emergency. Each step is a small, realistic piece of everyday work (a handover, a meeting, a worried visitor, a budget
request). The choices quietly set up the crisis that follows: each strong or mixed choice sets a `prep_*` flag, and the crisis scenario turns
those flags into a head start and into story callbacks (the same people, the same moments). All people, plants and hospitals are fictional.
The BLACKOUT workday is a composite day, not a record of what really happened at any company."""
from __future__ import annotations

from dataclasses import replace

from .engine import Choice as C, Ending, Event, Meter, Round, Scenario

PTS = {"strong": 14, "mixed": 7, "weak": 0}
WD = "A normal day"


def _w(id, title, clock, brief, question, facts, flag, skills, strong, mixed, weak, scene, part=WD):
    """Options are (label, summary, consequence, effects, lesson). Skill evidence follows a fixed pattern, so a weaker option never outscores a stronger one."""
    a, b = skills

    def mk(rating, o, flags, sk):
        label, summary, consequence, effects, lesson = o
        return C(f"{id}_{rating}", label, summary, consequence, rating, {**effects, "prepared": PTS[rating]}, flags=flags, skills=sk, lesson=lesson)
    return Round(id, title, clock, "workday", brief, question, tuple(facts), (
        mk("strong", strong, (flag,), {a: 2, b: 1}),
        mk("mixed", mixed, (flag + "_part",), {a: 1}),
        mk("weak", weak, (), {a: -1, b: -1}),
    ), part, scene)


PREPARED = Meter("prepared", "Preparedness for what comes", 0, "high", "Everything you set up today that will matter later.")
ENDS = (
    ("ready", "Ready for what comes", "good", 75), ("partly", "Mostly ready, with loose ends", "neutral", 40), ("unready", "The day passed, and little was set up", "bad", 0),
)


def _endings(texts):
    out = [Ending(i, t, texts[i], (("gte", "prepared", n),) if n else (), tone) for i, t, tone, n in ENDS]
    return tuple(out)


# ================================================================================================ COVID: a Tuesday at Riverside
COVID_ROUNDS = (
    _w("cw1", "Handover on Ward 4", "07:45", "Sister Anita Das is finishing a long night shift. Two patients overnight worried her, and she is too tired to say why.",
       "How do you take the handover?",
       ["It is an ordinary Tuesday at Riverside District Hospital, some weeks before anything unusual.",
        "In the staff room a television shows a short news item about a new respiratory illness abroad. Nobody is watching."],
       "prep_handover", ("communication", "teamwork"),
       ("Use the structured sheet: read back each plan and ask the night team what worried them", "Takes ten minutes.", "Sister Anita mentions a patient's slow breathing she had not written down. You catch it early, and the team starts the day aligned.",
        {"care": 3, "wellbeing": -1}, "Asking “what worried you?” brings out what a checklist misses."),
       ("Listen and take notes on the two sickest patients", "Quick.", "You know the two worries, but not the quieter ones.", {"care": 1}, "A partial handover leaves the quieter risks unseen."),
       ("Skim the list and head straight to the ward round", "Saves time.", "You start the round on time, but you walk past something small that a tired colleague could not put into words.", {"care": -2}, "Handovers are where small signals travel, or get lost."), "ward"),
    _w("cw2", "Ward round with Dr. Priya Rao", "09:00", "Dr. Priya Rao is a first-year resident, bright and nervous. She stays half a step behind you, afraid to say the wrong thing.",
       "How do you run the round with her?",
       ["Seven patients are on the round today, mostly routine.", "Dr. Farid Hakim, the senior consultant, will review the harder cases at noon."],
       "prep_mentor", ("teamwork", "communication"),
       ("Let Priya present and lead each plan; step in only to teach, and say why", "Slower, but she grows.", "Priya catches an error in a dosing note. By the end she is presenting without being asked.", {"wellbeing": -2, "care": 2}, "Teaching under low pressure builds judgement for high pressure."),
       ("Present yourself, but explain your reasoning aloud", "Efficient.", "Priya learns by watching, but stays quiet.", {"care": 1}, "Explaining is good; letting her try is better."),
       ("Run the round yourself, quickly; she can watch", "Fastest.", "The round ends early. Priya leaves knowing a little less than she could have.", {"wellbeing": 1}, "A junior who never leads is not ready when you need her to."), "ward"),
    _w("cw3", "The cupboard count", "10:30", "A porter mentions in passing that the oxygen cylinder store and the mask shelves look lower than usual.",
       "What do you do about it?",
       ["Nobody owns this problem: supplies, nursing and administration each think another team is watching it.", "The next scheduled delivery is in nine days."],
       "prep_stock", ("problem_solving", "risk_management"),
       ("Walk to the store, count it, set minimum levels and a standing order with supplies", "Fifteen minutes now.", "The count shows a thinner buffer than anyone thought. Supplies agrees a standing order with a minimum level, and the shelves are rechecked weekly.", {"oxygen": 6, "ppe": 5, "wellbeing": -1}, "A minimum level turns a hidden problem into a visible one."),
       ("Ask supplies to send more next week", "A start.", "More stock is promised, but nobody sets a minimum or checks the count.", {"oxygen": 2, "ppe": 1}, "A one-off request does not stop the problem from returning."),
       ("It is not your job; mention it to someone later", "Avoids a detour.", "Nothing changes. The shelves are a little emptier each week.", {"oxygen": -2, "ppe": -2}, "Shared problems with no owner are the ones that get worse."), "store"),
    _w("cw4", "Mrs. Verma's questions", "12:00", "The daughter of a patient has waited two days for results. She stops you in the corridor, close to tears and angry.",
       "How do you respond?",
       ["Her father is stable but his tests are delayed by a lab backlog.", "Several families have complained about not knowing what is happening."],
       "prep_family", ("communication", "ethical_judgment"),
       ("Sit down, say honestly what is known and what is not, and agree an update time you will keep", "Fifteen minutes.", "Mrs. Verma is still worried, but she knows when she will hear next. The anger drains away.", {"trust": 6, "wellbeing": -1}, "Predictable, honest updates calm people more than good news does."),
       ("Reassure her briefly and say a nurse will call", "Brief.", "She leaves slightly calmer, then waits for a call that is late.", {"trust": 2}, "A promise without a time becomes the next complaint."),
       ("Explain that results take as long as they take", "Accurate, not helpful.", "She leaves angrier. Another family hears about it by evening.", {"trust": -5}, "Being right is not the same as being heard."), "family"),
    _w("cw5", "The budget meeting", "14:00", "Mr. Rohan Kapoor, the hospital administrator, proposes closing ten stand-by beds to save money. They are empty most days.",
       "What do you say?",
       ["The beds were set aside after a hard winter two years ago.", "Mr. Kapoor is not careless: he has a budget to balance and a board to answer to."],
       "prep_surge", ("decision_making", "communication"),
       ("Bring the occupancy data; propose closing a few and keeping a documented surge plan for the rest", "Needs preparation.", "Mr. Kapoor accepts a smaller cut, and the surge plan is written down with a named owner.", {"capacity": 6, "trust": 2}, "A good argument comes with an alternative the other side can say yes to."),
       ("Accept the cut, but ask for a review in six months", "Compromise.", "The beds close. A review date is set, and nothing else.", {"capacity": -4}, "A review date is not a plan."),
       ("Agree; it is not your department", "Smooth.", "The ten beds are closed. Nobody wrote down how to reopen them.", {"capacity": -8}, "Capacity that is cheap to close is expensive to rebuild."), "office"),
    _w("cw6", "Sister Anita's rota", "15:30", "Sister Anita has covered three double shifts this fortnight. She does not complain, which worries you more than if she did.",
       "What do you do?",
       ["The ward is short by one nurse most days, and holidays are coming.", "Dr. Priya Rao has offered to cover an evening if it helps."],
       "prep_rota", ("teamwork", "ethical_judgment"),
       ("Fix the rota: swap rules, a floating nurse, and protected breaks starting this week", "Real change.", "The rota gets slack and rules for swaps. Sister Anita goes home on time for the first time in two weeks.", {"wellbeing": 6, "capacity": 1}, "Rest is infrastructure. Build it before you need it."),
       ("Thank her and promise to look at the rota", "Kind words.", "She is grateful. The rota stays as it is.", {"wellbeing": 1}, "Thanks without a change is a loan against someone's health."),
       ("Everyone is stretched; carry on", "Fair, in a way.", "Sister Anita keeps going. She does not mention it again.", {"wellbeing": -5}, "Tired people stop reporting that they are tired."), "ward"),
    _w("cw7", "The whiteboard", "17:30", "Dr. Farid Hakim is staying late. He has a thought he cannot shake: if the wards ever fill, who decides who is seen first, and on what basis?",
       "What do you do with that question?",
       ["Nobody has written anything down. It is a “just in case”.", "Priya and Sister Anita are still here and could help."],
       "prep_triage", ("prioritization", "teamwork"),
       ("Spend the hour: draft simple, fair criteria with the team, and pin them up", "An hour of your evening.", "Four people argue, then agree. The one-page sheet is imperfect and honest, and everyone has seen it.", {"care": 4, "trust": 2, "wellbeing": -2}, "Agree how to choose before the choosing is hard."),
       ("Leave it with Dr. Hakim to write", "Delegated.", "He writes a draft. Nobody else reads it.", {"care": 1}, "A rule that only one person has read is not a shared rule."),
       ("It is unlikely to ever be needed; go home", "Understandable.", "You leave on time. The whiteboard is wiped for the morning round.", {"care": -1}, "The questions you postpone become the ones you answer at your worst."), "office"),
)
COVID_ROUNDS = tuple(replace(r, part="Riverside District Hospital · a Tuesday") for r in COVID_ROUNDS)
COVID_WORKDAY = Scenario(
    id="covid_workday", title="A Day at Riverside: the Hospital Doctor's Ordinary Tuesday", profession="covid", kind="workday",
    tagline="Before the surge: a normal day on the ward.", role="Duty Medical Lead at a fictional district hospital", domain="Medicine · Everyday work", minutes=15,
    description="Seven ordinary moments on the ward: a handover, teaching, a stock check, a worried family, a budget meeting, a tired colleague and a question nobody has asked yet.",
    objectives=("Experience what an ordinary day in hospital medicine is like when nothing is on fire.", "See how small, unglamorous decisions decide how a crisis goes.", "Meet the people you will rely on later."),
    intro=("It is a Tuesday at Riverside District Hospital, a fictional hospital. Nothing dramatic is going to happen today.",
           "That is the point. Most of a doctor's work is patients, colleagues, stock cupboards and meetings. The choices you make today are small, and some of them will matter a great deal.",
           "Watch for the people: Sister Anita Das, Dr. Priya Rao, Dr. Farid Hakim, Mr. Rohan Kapoor. You will see them again."),
    disclaimer="Fictional hospital, staff and families. Educational only: not medical training, and no treatment advice.",
    meters=(Meter("capacity", "Bed capacity headroom", 80, "high"), Meter("oxygen", "Oxygen reserve", 70, "high"), Meter("ppe", "Protective equipment", 65, "high"),
            Meter("wellbeing", "Staff wellbeing", 70, "high"), Meter("care", "Quality of care", 75, "high"), Meter("trust", "Family and community trust", 65, "high"), PREPARED),
    rounds=COVID_ROUNDS,
    events=(
        Event("cw_priya", 4, "Priya covers a call for you", "Dr. Priya Rao quietly handled two routine calls while you were with a family. The ward ran smoothly.", (("flag", "prep_mentor"),), {"wellbeing": 2}, kind="workday"),
        Event("cw_note", 6, "A thank-you note", "Mrs. Verma left a note and a box of sweets for the ward: “Thank you for telling me when I would hear.”", (("flag", "prep_family"),), {"trust": 3}, kind="workday"),
        Event("cw_nearmiss", 7, "A near miss on the evening round", "Tired from a long fortnight, Sister Anita nearly gives the wrong dose. A colleague catches it. Nobody is hurt, and everyone is shaken.", (("no_flag", "prep_rota"), ("no_flag", "prep_rota_part")), {"care": -4, "wellbeing": -3}, kind="workday"),
        Event("cw_news", 5, "On the news", "The television in the staff room shows hospitals abroad restricting visitors. Someone changes the channel.", (), {}, kind="workday"),
    ),
    endings=_endings({"ready": "You left Riverside in better shape than you found it: people who trust each other, stock you can count, and a page of criteria on the wall. You hope you will never need it.",
                      "partly": "Some groundwork is laid and some is not. You will find out which, and when.",
                      "unready": "It was a perfectly normal day, and it passed without setting anything up. If something comes, the hospital will be meeting it as it is."}),
    lessons=("Most of a doctor's work is ordinary, and ordinary work is where crises are prepared for or not.", "Teaching, rotas and stock counts are patient safety work.",
             "Honest, predictable communication builds trust you will spend later.", "Agree how to choose before the choosing is hard."),
    next_up=("covid",),
)

# ================================================================================================ BHOPAL: a Thursday at Kestrel Works
BHOPAL_ROUNDS = (
    _w("bw1", "Shift handover", "06:45", "Marta Ilves, the night shift supervisor, is handing over to you. She is brisk, and has been awake for fourteen hours.",
       "How do you take the handover?",
       ["Kestrel Works is a fictional chemical plant. It stores a toxic liquid in a large tank, behind several layers of protection.", "Three permits to work are open, and one interlock is marked “under test”."],
       "prep_handover", ("communication", "risk_management"),
       ("Walk the open permits together and confirm each interlock is back in service", "Twenty minutes.", "Marta points out a valve tag that did not match the permit. You fix it before the day shift starts.", {"readiness": 3}, "A shared walk-through catches what paperwork hides."),
       ("Read the handover log and sign", "Standard.", "The log is accurate as far as it goes.", {"readiness": 1}, "A log records what someone remembered to write."),
       ("Sign quickly; Marta needs sleep", "Kind, risky.", "The tag mismatch goes unnoticed until later.", {"readiness": -2, "hazard": 2}, "Kindness that skips the check is a risk handed to someone else."), "control"),
    _w("bw2", "The walk-round", "08:30", "On your weekly safety walk-round you stop at the cooling unit. Its alarm test sticker says “overdue”, and a bypass tag hangs on the control panel.",
       "What do you do?",
       ["The cooling unit holds the stored liquid at a safe temperature.", "The bypass tag was probably left by a technician last month. Probably."],
       "prep_alarm_test", ("risk_management", "decision_making"),
       ("Remove the bypass, run and log the alarm test now, and fix who is responsible for the next one", "Costs the morning.", "The test shows a slow response in the alarm. Dev Raman recalibrates it the same day, and the test is put on the calendar with an owner.", {"safeguards": 8, "output": -2}, "An untested alarm is a hope, not a safeguard."),
       ("Note it and schedule the test for next week", "Reasonable.", "The note is filed. The bypass tag stays another week.", {"safeguards": 2}, "A bypass that stays is a safeguard that is off."),
       ("The cooling unit has run fine for years; carry on", "Pragmatic.", "Nothing happens. Nothing changes.", {"safeguards": -4, "hazard": 3}, "“It has always worked” is what every incident report says."), "cooling"),
    _w("bw3", "A near miss", "10:00", "Lena Okafor, an operator, finds you. A valve on a transfer line wept a few drops this morning. She stopped it. She is afraid of being blamed.",
       "How do you respond?",
       ["No one was hurt and no alarm sounded.", "How the plant treats Lena today decides whether the next person speaks up."],
       "prep_reporting", ("communication", "ethical_judgment"),
       ("Thank her, log it as a near miss, and share what you learn with the whole shift", "A few minutes.", "Lena relaxes. The log shows the same valve weeping once before. The shift hears it as a lesson, not a blame.", {"trust": 6, "readiness": 2}, "People report problems when reporting is safe."),
       ("Thank her and fix the valve quietly", "Kind.", "The valve is fixed. The shift learns nothing.", {"trust": 2}, "A fix nobody hears about does not prevent a repeat."),
       ("Tell her to be more careful with that valve", "Blame.", "Lena nods and leaves. She will think twice before telling you anything again.", {"trust": -6}, "Blame teaches silence."), "line"),
    _w("bw4", "The contractor's request", "11:30", "A contractor needs to clear a job by noon. He asks you to let him bypass the scrubber's alarm “just for today”, while he works near it.",
       "How do you answer?",
       ["The scrubber is one of the plant's protection layers.", "Dev Raman says the bypass would save two hours of schedule."],
       "prep_no_bypass", ("risk_management", "decision_making"),
       ("Refuse the bypass, and offer a scheduled offline window with a safe alternative", "Costs the contractor time.", "The contractor grumbles. Dev Raman finds a way to do the job during a planned shutdown, with the alarm intact.", {"safeguards": 5, "output": -3}, "Disabling a safeguard needs a plan, not a favour."),
       ("Allow it with a supervisor watching the whole time", "A compromise.", "The job finishes on time. The supervisor, bored, leaves after an hour.", {"safeguards": -1}, "A human watching is a weaker safeguard than the one switched off."),
       ("Allow it; the day is short", "Easy.", "The bypass stays on past noon. Nobody notices until the end of the day.", {"safeguards": -6, "hazard": 4}, "Each bypass is small. They add up."), "scrubber"),
    _w("bw5", "Head office on the line", "13:30", "Jonas Berg from head office wants a ten percent cut in the maintenance and training budget this quarter. He asks you for a list of savings “that will not affect safety”.",
       "What do you send?",
       ["Head office is under pressure from its own board.", "You keep a risk register that Jonas has never opened."],
       "prep_riskreg", ("ethical_judgment", "communication"),
       ("Send savings that avoid safety-critical items, with the risk register showing what each cut would cost", "A hard conversation.", "Jonas is annoyed, then reads the register for the first time. He accepts a smaller target.", {"trust": 4, "output": -2}, "Make the trade-off visible, and let the decision-maker own it."),
       ("Send a list but leave safety out of the discussion", "Avoids friction.", "The list is accepted. What each item risks stays unspoken.", {"output": 1}, "A cut accepted without its risk is a risk nobody owns."),
       ("Say safety will not be affected and send the full cuts", "Compliant.", "The cuts go through. The word “safety” is in your email, and it is not true.", {"output": 3, "trust": -3, "readiness": -3}, "Reassuring head office with something you do not believe is how the gaps start."), "office"),
    _w("bw6", "Mrs. Aydin and the siren", "15:00", "A neighbour, Mrs. Aydin, rings the gate. She lives beside the fence line. She asks what the siren is for, and what she should do when it sounds.",
       "What do you do?",
       ["The plant tests its siren on the first Monday of each month. Most neighbours have never been told what it means.", "A community open day has been suggested before. Nobody had time."],
       "prep_community", ("communication", "ethical_judgment"),
       ("Explain plainly, give her a one-page card, and offer to bring neighbours to an open day", "Half an hour.", "Mrs. Aydin leaves with the card and says she will tell the street.", {"community": 10, "trust": 2}, "People near a hazard have a right to know what the alarm means."),
       ("Tell her it is only a test and not to worry", "Brief.", "She is reassured, and knows nothing more.", {"community": 2}, "Reassurance is not preparation."),
       ("Say it is nothing you need to worry about", "Dismissive.", "She hangs up. She will not ask again.", {"community": -3, "trust": -2}, "A neighbour who is not told fills the gap with fear or with nothing."), "gate"),
    _w("bw7", "Induction for the new operators", "16:30", "Four new operators start Monday. You have an hour with them today. Your slide deck is ready, and so is a mock emergency exercise that would take the whole hour.",
       "How do you use the hour?",
       ["Training is the first thing cut when the schedule is tight.", "The exercise would put them in a mock alarm, with real radios and a real exit route."],
       "prep_drill", ("teamwork", "decision_making"),
       ("Run the mock exercise: alarm, radios, assembly point, and a debrief", "A busy, slightly chaotic hour.", "Two operators go the wrong way. They never will again. Marta hears about it and asks to run it for her shift.", {"readiness": 7}, "People remember what they do, not what they are shown."),
       ("Do half: walk the route, skip the alarm", "Compromise.", "They know where to go. They have not heard the siren in a drill.", {"readiness": 3}, "Knowing the route is not the same as moving along it in a hurry."),
       ("Go through the slides, then head home", "On schedule.", "The slides are clear. Nobody remembers them.", {"readiness": 0}, "Slides are what you have when you have no time. They do not stick."), "yard"),
)
BHOPAL_ROUNDS = tuple(replace(r, part="Kestrel Works · a Thursday") for r in BHOPAL_ROUNDS)
BHOPAL_WORKDAY = Scenario(
    id="bhopal_workday", title="A Day at Kestrel Works: the Plant Safety Manager's Ordinary Thursday", profession="bhopal", kind="workday",
    tagline="Before the audit week: a normal day at a chemical plant.", role="Plant Safety Manager at a fictional chemical plant", domain="Industrial safety · Everyday work", minutes=15,
    description="Seven ordinary moments at a chemical plant: a handover, a walk-round, a near miss, a contractor's request, a head-office email, a worried neighbour and an induction.",
    objectives=("Experience what process safety work is like on a day when nothing goes wrong.", "See how small decisions about alarms, culture and training decide how an incident goes.", "Meet the people and equipment you will depend on later."),
    intro=("Kestrel Works is a fictional chemical plant. It stores a toxic liquid in a large tank, behind several layers of protection. Today is a normal Thursday.",
           "Most of a safety manager's work is invisible when it succeeds: a test logged, a bypass removed, a neighbour who knows what a siren means. This day is made of those moments.",
           "Watch for the people: Marta Ilves, Dev Raman, Lena Okafor, Jonas Berg, Mrs. Aydin. You will see them again."),
    disclaimer="Fictional plant, people and events, designed for practice. It is not a reconstruction of any real facility.",
    meters=(Meter("safeguards", "Safety systems working", 62, "high"), Meter("hazard", "Hazard exposure", 40, "low"), Meter("readiness", "Workforce readiness", 55, "high"),
            Meter("community", "Community preparedness", 25, "high"), Meter("trust", "Trust of workers and regulator", 58, "high"), Meter("output", "Production schedule", 72, "high"), PREPARED),
    rounds=BHOPAL_ROUNDS,
    events=(
        Event("bw_recal", 3, "The alarm responds", "Dev Raman recalibrated the cooling alarm after your test. It trips two seconds sooner than it did this morning.", (("flag", "prep_alarm_test"),), {"hazard": -3}, kind="workday"),
        Event("bw_lena", 5, "Lena speaks up again", "Lena Okafor stops you on the stairs with another small observation. She is not afraid to tell you now.", (("flag", "prep_reporting"),), {"trust": 2}, kind="workday"),
        Event("bw_bypass", 7, "The tag at the end of the day", "On your last walk-round you find the scrubber bypass still switched on, and the contractor gone home.", (("no_flag", "prep_no_bypass"),), {"hazard": 5, "safeguards": -3}, kind="workday"),
        Event("bw_email", 5, "An email from head office", "Subject: “Q3 savings targets: please confirm by Friday.” You will read it properly after lunch.", (), {}, kind="workday"),
    ),
    endings=_endings({"ready": "You leave the plant a little safer than you found it: tested alarms, a shift that speaks up, neighbours who know the siren. None of it will make a headline.",
                      "partly": "Some of the day's work will matter and some will not. The gaps are quiet, and they are real.",
                      "unready": "A normal day, and nothing was set up. If the plant is tested, it will be tested as it is."}),
    lessons=("Safety work is mostly invisible when it succeeds.", "A safeguard that is untested or bypassed is not a safeguard.", "People report problems when reporting is safe.", "People near the plant need to know what the siren means."),
    next_up=("bhopal",),
)

# ================================================================================================ BLACKOUT: a Monday at the terminal
BLACKOUT_ROUNDS = (
    _w("bow1", "Morning briefing", "07:30", "A container vessel is due at ten, the gate queue is already forming, and the Operations Manager wants a plan for the day.",
       "How do you run the morning briefing?",
       ["This is a composite ordinary day at a fictional container terminal, the day before everything changes.", "Five people are in the room: the IT Lead, the Terminal Supervisor, the Operations Manager, the Network Administrator and the Customer Representative."],
       "prep_briefing", ("communication", "teamwork"),
       ("Go round the table: one risk and one need from each person, then agree who owns what", "Fifteen minutes.", "Each person leaves knowing what they own and who to call. The Operations Manager says the briefing was the first one in months that was not a status report.", {"team": 6, "ops": 2}, "A briefing that asks for risks, not only updates, finds problems early."),
       ("Run the usual status round", "Familiar.", "Everyone reports. Nobody raises a worry.", {"team": 1}, "Status rounds tell you what is happening, not what could."),
       ("Skip it; people know their jobs", "Saves time.", "The day starts. Two teams double-book the same crane.", {"ops": -3, "team": -2}, "Knowing your job is not the same as knowing each other's."), "ops"),
    _w("bow2", "The patching request", "09:00", "The IT Lead says a set of older Windows servers is overdue for security updates. Patching needs a one-hour outage and a hole in the vessel schedule.",
       "What do you decide?",
       ["The servers support gate processing and the yard system.", "A software update from a vendor's Ukraine office is also queued for tomorrow. It is routine."],
       "prep_patch", ("risk_management", "decision_making"),
       ("Approve a patching window this week, with a rollback plan", "Costs an hour of schedule.", "The IT Lead schedules the window. The servers get their updates, and the rollback plan is tested.", {"systems": 8, "ops": -3}, "Routine maintenance is the cheapest defence there is."),
       ("Approve patching next month", "Delayed.", "The window is set. The servers wait four more weeks.", {"systems": 2}, "Delay is a choice with a cost."),
       ("Defer: the schedule is tight", "Pragmatic.", "The servers stay as they are. The IT Lead writes the risk down, and does not look happy.", {"systems": -4, "ops": 2}, "A written risk that is not acted on is just a record."), "server"),
    _w("bow3", "Do the backups work?", "10:30", "While reading a report, the Network Administrator asks when anyone last restored a backup. Nobody remembers. The backups run every night. They have never been restored.",
       "What do you do?",
       ["Backups that have never been restored are a belief, not a fact.", "A real restore test needs an hour and a spare machine."],
       "prep_backup", ("problem_solving", "risk_management"),
       ("Do a real restore test of the yard system from the offline copy, and write down how long it took", "Takes the morning.", "The test finds the backup is two weeks stale on one server. It is fixed, and the restore time is written on the wall.", {"systems": 4, "ops": -2}, "Test the thing you will need on the worst day."),
       ("Check that the backup jobs show as complete", "Quick.", "The jobs show green. Nobody has tried to use one.", {"systems": 1}, "A green light says the job ran, not that the data is usable."),
       ("Backups run every night; it is fine", "Trusting.", "Nothing is checked.", {"systems": -2}, "Untested backups fail at exactly the wrong time."), "server"),
    _w("bow4", "A call from a customer", "12:00", "The Customer Representative has a worried call from a hospital supplier. If the terminal ever goes dark, how will they reach someone who can say where their cargo is?",
       "How do you handle it?",
       ["The supplier ships urgent medical supplies through the terminal.", "At the moment, urgent customers have a general email address and nothing else."],
       "prep_contacts", ("communication", "teamwork"),
       ("Set up a named contact for urgent customers, with a phone tree that does not depend on the systems", "An afternoon of work.", "A one-page call list goes to every urgent customer. Two of them reply with their own out-of-hours numbers.", {"customers": 8, "team": 1}, "A contact list on paper works when the systems do not."),
       ("Send them the general email address again", "Easy.", "The supplier is a little reassured.", {"customers": 2}, "A shared inbox is not a plan for an outage."),
       ("Tell them the terminal has never gone down", "True, so far.", "They end the call unconvinced, and a little uneasy.", {"customers": -3}, "“It has never happened” is not an answer to “what if”."), "gate"),
    _w("bow5", "A paper-process drill", "14:00", "The Terminal Supervisor wants to test what gate staff would do if the screens went blank: manual checks, paper forms, a radio net. It means an hour with her team and a slow queue.",
       "What do you say?",
       ["Gate staff have never practised without screens.", "The Terminal Supervisor has been asking for this for a year."],
       "prep_manual", ("teamwork", "decision_making"),
       ("Back the drill: run it at the quietest hour, and write the paper forms up afterwards", "A slow hour.", "The drill is clumsy the first time. The forms are fixed twice, and the team ends the hour laughing and confident.", {"safety": 4, "ops": -2, "team": 4}, "Rehearse the bad day on a good one."),
       ("Allow a briefing instead of a drill", "A compromise.", "The staff hear about the paper process. Nobody does it.", {"safety": 1}, "Hearing about a procedure is not the same as having done it."),
       ("Not now; the queue is long enough", "Practical.", "The Terminal Supervisor nods and leaves. She does not ask again.", {"safety": -2, "team": -3}, "Postponing a drill forever is a decision."), "gate"),
    _w("bow6", "The network request", "15:30", "The Network Administrator asks for budget to separate the office network from the yard network, so that a problem in one cannot easily spread to the other. It is dull work with no visible benefit.",
       "What do you decide?",
       ["The two networks are currently connected, for convenience.", "The cost is modest, and the work takes two weeks."],
       "prep_segmentation", ("risk_management", "decision_making"),
       ("Approve it, and ask for a plan with the order of work", "A modest cost.", "The Network Administrator starts that week. The first separation point is in place before the month is out.", {"systems": 5, "ops": -1}, "Segmentation turns an incident into a smaller incident."),
       ("Approve half now, half next quarter", "Phased.", "The most exposed link is separated. The rest waits.", {"systems": 2}, "Half a fence still has a gate."),
       ("Not now; nothing has gone wrong", "Prudent with money.", "The request goes into next year's list.", {"systems": -1}, "Spending on something that has not failed is the point of it."), "server"),
    _w("bow7", "The backup carrier", "17:00", "You have an hour before leaving. The supplier relations file shows a single trucking company moves most of your urgent cargo. If it ever failed, you would have no plan.",
       "What do you do with the hour?",
       ["A second carrier would have to be approved and briefed.", "Nobody is asking you to do this."],
       "prep_supplier", ("problem_solving", "communication"),
       ("Call a second carrier, agree terms for short-notice work, and put the number in the shared contact list", "An hour well spent.", "The second carrier agrees to a standby arrangement. Their number joins the paper contact list.", {"ops": 3, "customers": 2}, "A second option agreed today costs little. Tomorrow it costs a great deal."),
       ("Ask your assistant to look into it next week", "Delegated.", "A note is made. Nothing is agreed.", {"ops": 1}, "A task delegated without a date is a task postponed."),
       ("It has worked fine; leave it", "Fine for now.", "The file stays as it is.", {"ops": -1}, "A single point of failure is a risk that looks like efficiency."), "gate"),
)
BLACKOUT_ROUNDS = tuple(replace(r, part="The container terminal · a Monday") for r in BLACKOUT_ROUNDS)
BLACKOUT_WORKDAY = Scenario(
    id="blackout_workday", title="A Monday at the Terminal: the Recovery Lead's Ordinary Day", profession="blackout", kind="workday",
    tagline="The day before everything changes: a normal day at a container terminal.", role="Operations and recovery lead at a fictional container terminal", domain="Operations · Everyday work", minutes=15,
    description="Seven ordinary moments at a container terminal: a morning briefing, a patching request, a backup question, a worried customer, a paper-process drill, a network request and a backup carrier.",
    objectives=("Experience what running a terminal is like on a day when nothing is wrong.", "See how unglamorous decisions about patching, backups and drills decide how a cyber crisis goes.", "Meet the five people you will depend on later."),
    intro=("This is a composite ordinary day at a fictional container terminal, the Monday before a cyberattack that will stop it. It is not a record of what happened at any real company.",
           "Most of an operations lead's job is keeping a complicated system moving, which means thousands of small decisions nobody notices. Patching, backups, drills and contact lists are the quiet ones.",
           "Watch for the five people in the room: the IT Lead, the Terminal Supervisor, the Operations Manager, the Network Administrator and the Customer Representative."),
    disclaimer="A composite, fictional day to give the crisis a before. The people are fictional roles. The crisis that follows is based on the documented 2017 NotPetya attack on Maersk, in outline.",
    meters=(Meter("ops", "Terminal flow", 70, "high"), Meter("systems", "Systems health", 55, "high"), Meter("team", "Team confidence", 60, "high"),
            Meter("customers", "Customer confidence", 65, "high"), Meter("safety", "Site safety", 85, "high"), PREPARED),
    rounds=BLACKOUT_ROUNDS,
    events=(
        Event("bow_double", 2, "Two cranes, one slot", "Without a briefing, two teams planned the same crane for the same slot. The vessel waits twenty minutes.", (("no_flag", "prep_briefing"), ("no_flag", "prep_briefing_part")), {"ops": -4}, kind="workday"),
        Event("bow_restore", 4, "Restore time on the wall", "The restore test took fifty minutes. The Network Administrator wrote it on the whiteboard with a marker: it is the first number anyone has had.", (("flag", "prep_backup"),), {"team": 2}, kind="workday"),
        Event("bow_update", 3, "A routine update", "A tax-software update notice arrives from the vendor's Ukraine office. It is queued for tomorrow morning like any other.", (), {}, kind="workday"),
        Event("bow_hospital", 5, "The hospital supplier writes back", "The hospital supplier says it will pass your call list to its logistics team. “It is good to know who to call.”", (("flag", "prep_contacts"),), {"customers": 3}, kind="workday"),
    ),
    endings=_endings({"ready": "You leave the terminal in better shape than you found it: patched servers, a restored backup, a paper drill behind you and a contact list that does not need the systems. Tomorrow will test that.",
                      "partly": "Some groundwork is done and some is not. Tomorrow will show you which.",
                      "unready": "A normal day, and nothing was set up. Tomorrow will meet the terminal as it is."}),
    lessons=("The quiet decisions about patching, backups and drills decide how a cyber crisis goes.", "A backup that has never been restored is a belief, not a fact.", "Rehearse the bad day on a good one.", "A contact list on paper works when the systems do not."),
    next_up=("blackout",),
)

WORKDAYS = {"covid": COVID_WORKDAY, "bhopal": BHOPAL_WORKDAY, "blackout": BLACKOUT_WORKDAY}
