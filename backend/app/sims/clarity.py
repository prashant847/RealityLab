"""Plain-language descriptions of every option in the Bhopal and COVID-era hospital simulations (the ordinary days and the crises).

An option's `summary` is the sentence a player reads under its label before choosing. It says what you would actually be doing, what it takes and what it leaves
undone, in words a student can follow without knowing the field. The scored text (labels, consequences, lessons) is not touched here, and neither is how an
option is rated. The documented history steps (h1-h7) already carry full sentences and are not listed.
"""
from __future__ import annotations

from dataclasses import replace

SUMMARIES: dict[str, str] = {
    # ---------------------------------------------------------------- Bhopal: a day at the plant
    "bw1_strong": "About twenty minutes. You and Marta walk to each open permit (the signed papers allowing work on equipment) and check on the spot that every safety interlock, the automatic cut-off, is back in service.",
    "bw1_mixed": "About five minutes. You read the handover log that Marta wrote overnight and sign it. It is the normal routine, but it only covers what she remembered to write down.",
    "bw1_weak": "Saves time and lets Marta go home to sleep. You sign the handover without checking, so the interlock that was still under test is taken on trust.",
    "bw2_strong": "Costs most of the morning. You take off the temporary bypass, run the alarm test now and write the result in the log, and agree who owns the test next time so it is not missed again.",
    "bw2_mixed": "Takes a few minutes now. You note the overdue alarm test and book it for next week, so the cooling unit runs another week with the bypass still on.",
    "bw2_weak": "Takes no time. You carry on because the cooling unit has run fine for years, and the overdue test and the bypass are left as they are.",
    "bw3_strong": "A few minutes. You thank Lena, log the leak as a near miss (an accident that nearly happened), and tell the whole shift what you learned, so reporting feels safe.",
    "bw3_mixed": "A few minutes. You thank Lena and get the valve fixed, but you keep it quiet, so nobody else on the shift hears about it or learns from it.",
    "bw3_weak": "Takes a minute. You tell Lena to be more careful with the valve. The leak is dealt with, but she and the others learn that reporting a small problem brings blame.",
    "bw4_strong": "Costs the contractor time. You refuse to switch the alarm off, and instead offer a booked time when that line is shut down and made safe, with a safe way to do the job meanwhile.",
    "bw4_mixed": "Saves most of the two hours. You allow the alarm to be switched off only while a supervisor watches the equipment the whole time, so a person replaces the safeguard.",
    "bw4_weak": "Saves the contractor two hours. You allow the alarm to be switched off until noon with nobody assigned to watch, because the day is short.",
    "bw5_strong": "A hard conversation. You send the savings that avoid safety-critical items, and attach the risk register, the list of known risks, showing what each cut would cost in safety.",
    "bw5_mixed": "Avoids an argument. You send a list of cuts and say nothing about safety, so head office never sees what each cut would risk.",
    "bw5_weak": "Gives head office what it wants. You tell them safety will not be affected and send the full ten percent of cuts, including items you are not sure about.",
    "bw6_strong": "About half an hour. You explain what the siren means and what to do, give Mrs. Aydin a one-page card, and invite her and her neighbours to an open day at the plant.",
    "bw6_mixed": "A minute or two. You tell Mrs. Aydin the siren is only a test and not to worry, which is true but does not tell her what to do if it is ever real.",
    "bw6_weak": "A few seconds. You say it is nothing she needs to worry about, so she is none the wiser about what the siren means or what to do when it sounds.",
    "bw7_strong": "A busy, slightly chaotic hour. You run a mock exercise with the new operators: the alarm sounds, they use the radios, walk to the assembly point and then talk it through afterwards.",
    "bw7_mixed": "About half the time. You walk the new operators along the escape route but skip sounding the alarm, so they know the way but have not heard the siren in a drill.",
    "bw7_weak": "On schedule and easy. You go through the safety slides and head home, so the new operators have seen the plan but have not practised any of it.",
    # ---------------------------------------------------------------- COVID: a day at Riverside
    "cw1_strong": "About ten minutes. You use the structured handover sheet, read back each patient's plan, and ask the night team what worried them, which brings out things a checklist misses.",
    "cw1_mixed": "A few minutes. You listen and take notes on the two sickest patients, so you know their plans but not the quieter worries about the others.",
    "cw1_weak": "Saves time. You skim the patient list and go straight to the ward round, so anything Sister Anita was too tired to explain goes unheard.",
    "cw2_strong": "A slower round. Priya presents each patient and leads the plan, and you step in only to teach and explain why, so she gains confidence and you see how she thinks.",
    "cw2_mixed": "A steady round. You present each patient yourself and explain your reasoning aloud, so Priya learns by watching but does not get to try.",
    "cw2_weak": "The fastest round. You run it yourself and Priya watches, so you finish early but she has learned a little less than she could have.",
    "cw3_strong": "About fifteen minutes now. You go to the oxygen and mask store, count what is there, set a minimum level for each item and agree a standing order with the supplies department.",
    "cw3_mixed": "A minute. You ask the supplies department to send more next week, so the store may be fuller later but nobody has checked how low it is now.",
    "cw3_weak": "Saves a detour. You decide it is not your job and mention it to someone later, so the thin stock stays unchecked for now.",
    "cw4_strong": "About fifteen minutes. You sit down with Mrs. Verma, say honestly what is known and what is not, and agree a time for the next update that you will keep.",
    "cw4_mixed": "A minute or two. You reassure her briefly and say a nurse will call, but you give no times and no new information.",
    "cw4_weak": "A minute. You explain that test results take as long as they take, which is accurate but leaves her no better informed or less anxious.",
    "cw5_strong": "Needs preparation. You bring the bed-occupancy data, propose closing a few of the ten empty beds, and keep a written plan for reopening the rest if a surge comes.",
    "cw5_mixed": "A short compromise. You accept the cut to the empty beds but ask for a review in six months, with no plan for what would happen if they were needed sooner.",
    "cw5_weak": "Smooth and quick. You agree to the cut because bed budgets are not your department, and the empty beds are lost without any plan.",
    "cw6_strong": "Real change this week. You fix the rota: rules for swapping shifts, a floating nurse who covers gaps, and protected breaks, so Sister Anita and others actually get rest.",
    "cw6_mixed": "Kind words only. You thank her and promise to look at the rota, but nothing about her hours or the gaps changes yet.",
    "cw6_weak": "Takes no time. You say everyone is stretched and carry on, so the rota stays the same and Sister Anita keeps working the hours that are wearing her down.",
    "cw7_strong": "An hour of your evening. You sit with the team and draft simple, fair rules for who gets a bed or a ventilator if the wards ever fill, and pin them up where everyone can see them.",
    "cw7_mixed": "A minute. You leave the question with Dr. Hakim to write up, so it may get written but you and the team have no say in it.",
    "cw7_weak": "Takes no time. You decide it is unlikely ever to be needed and go home, so nothing is written down and the question is left for the worst moment.",
    # ---------------------------------------------------------------- Bhopal: the crisis at the plant
    "f1_strong": "Costs output and time. You stop storing more product until the cooling system is restored and the scrubber (which cleans escaping gas), the flare and the cooling are each tested at full load.",
    "f1_mixed": "Partly fixes it. You restore the cooling now, but the scrubber and flare checks wait until next quarter, so two safeguards stay untested for months.",
    "f1_weak": "Keeps production on schedule. You put the repair in the next budget cycle and write the risk in the risk register, so the cooling stays off meanwhile.",
    "f2_strong": "Slower savings. You refuse cuts to safety-critical roles, and accept the other cuts only after checking that the remaining staff are competent for their jobs.",
    "f2_mixed": "A middle path. You accept the cuts, but require the remaining staff to be cross-trained for each other's jobs and a supervisor to be on duty every night.",
    "f2_weak": "Maximum savings. You accept the full staffing cut to meet the cost target, including training and night supervision.",
    "f3_strong": "Delays a shipment. You stop the transfers, isolate the leaking line, repair the gauge before restarting, and tell the workers exactly what happened.",
    "f3_mixed": "Keeps the schedule. Transfers continue with extra manual checks while the gauge is repaired this week, so the faulty gauge is still in use for now.",
    "f3_weak": "Protects the schedule. You log the leak and the gauge as minor and keep the transfers running with no extra checks.",
    "f4_strong": "Takes time and money. You run a joint drill with the local authorities, install an alarm the community can hear, and share plain hazard information with residents.",
    "f4_mixed": "Limited. You run a drill inside the plant and send out an information leaflet, so the neighbours have been told but have not practised what to do.",
    "f4_weak": "Avoids discussion. You skip it because it could alarm residents and attract attention, so the neighbours stay unprepared.",
    "f5_strong": "Disruptive, and it may turn out to be a false alarm. You start the emergency procedure now, alert the authority and sound the community alarm, then investigate.",
    "f5_mixed": "Reasonable but slower. You send the night team to check on the spot and escalate only if the problem is confirmed within thirty minutes.",
    "f5_weak": "Avoids a false alarm. You treat it as a fault in the instrument and wait for the day shift to look at it.",
    "f6_strong": "Exposes the company. You report fully and promptly to the regulator and the workers, commission an independent review, and publish what it finds.",
    "f6_mixed": "Compliance only. You report to the regulator but keep your own internal review private, so the regulator sees the facts but others cannot learn from them.",
    "f6_weak": "Protects the company. You limit the report to what the regulator already knows and put the blame on operator error.",
    # ---------------------------------------------------------------- COVID: the surge at the hospital
    "c1_strong": "Takes the first hour to organise. You set up a triage process (sorting patients by how urgently they need care) using agreed criteria, name a triage lead for each shift, and tell the team what is known and unknown.",
    "c1_mixed": "Fast, but it depends on one person. The most senior doctor on shift sorts patients case by case, with no written criteria for anyone else to follow.",
    "c1_weak": "Simple, and it seems fair. Patients are seen in the order they arrive, which ignores that some are far more seriously ill than others.",
    "c2_strong": "Needs staff and effort. You reopen the closed outpatient wing as a monitored step-down area (for patients who are stable but still need watching), move patients there using clear criteria, and arrange transfers with the neighbouring hospital.",
    "c2_mixed": "Fast, but it thins other wards. You reopen the wing and staff it by pulling nurses from the existing wards.",
    "c2_weak": "Avoids overload for now. You stop admitting new patients until beds free up, so people who need care are turned away.",
    "c3_strong": "Requires discipline. You write a protection plan with the infection control team that gives the best equipment to the highest-risk areas, track stock every day, and refuse equipment that is not certified.",
    "c3_mixed": "Local flexibility. You leave each ward to decide how to use what it has, so protection depends on which ward a person works in.",
    "c3_weak": "Solves the shortage on paper. You buy the uncertified equipment to keep the wards stocked, even though nobody knows whether it protects the people wearing it.",
    "c4_strong": "Takes staff time and causes some friction. You audit how oxygen is used, set up monitoring so it goes where it is most needed, and escalate to the supplier and the district office for an emergency supply.",
    "c4_mixed": "A single action. You ask the supplier to hurry and wait, with no change in how oxygen is used in the meantime.",
    "c4_weak": "Hidden rationing. You quietly limit oxygen to the least-sick patients without telling the team, so nobody can question or check the decision.",
    "c5_strong": "Takes some minutes. You apply the hospital's agreed criteria, consult the on-call senior colleague, write down the reasons and tell both families honestly what you decided and why.",
    "c5_mixed": "Quick. You decide alone, on your own judgement of who would benefit most, with no agreed criteria and nobody to check it with.",
    "c5_weak": "Avoids choosing. You give the bed to whoever arrived first, whatever each patient's need.",
    "c6_strong": "Needs a person and a schedule. You create a family liaison role, set times for updates, arrange video calls where possible, and give plain, honest information.",
    "c6_mixed": "Flexible. Families are updated whenever a doctor can spare the time, so some hear often and others not at all.",
    "c6_weak": "Protects staff time. You send families to the website and stop taking their calls, so people who want to know how their relative is have nobody to ask.",
    "c7_strong": "Short-term cover is stretched. You introduce mandatory rest rotation, bring in extra staff with a short orientation, and set up peer support so colleagues can look after each other.",
    "c7_mixed": "Cheap. You thank the staff publicly and ask them to push through, so their workload and hours stay exactly as they are.",
    "c7_weak": "Pressure. You tell staff that absence will be treated as a performance problem, which makes tired people hide how tired they are.",
    "c8_strong": "Takes effort now. You run a structured debrief, update the protocols from what worked and failed, share the lessons with neighbouring hospitals and plan recovery time for the team.",
    "c8_mixed": "Light. You hold a short thank-you meeting and go back to normal, so what was learned is not written down or passed on.",
    "c8_weak": "Avoids the pain. You move on and avoid talking about the hard weeks, so the same problems are still in place for the next surge.",
}


def clarify(sc):
    """The scenario with each option's summary replaced by its plain-language description (everything else is unchanged)."""
    return replace(sc, rounds=tuple(replace(rd, choices=tuple(replace(c, summary=SUMMARIES.get(c.id, c.summary)) for c in rd.choices)) for rd in sc.rounds))
