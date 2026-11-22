import type { SpriteWho } from "../../comic/stick/StickSprite";
import opinions from "./workdayOpinions.json";

/**
 * What the two colleagues in each step would do, in their own words. Every decision in the three professions has this:
 * the Team tab lets you ask each of them, and they answer with an option number and a reason. They are advisers, not the answer key:
 * the second voice often sees a different priority, and the decision (and the result) is always the player's.
 * [who, the option they back: 0 = the one with id ending _strong, 1 = _mixed, 2 = _weak (the order shown to the player varies), what they say]
 */
export type Tip = [who: SpriteWho, pick: 0 | 1 | 2, say: string];

export const ADVICE: Record<string, [Tip, Tip]> = {
  // ------------------------------------------------------------ BLACKOUT: a Monday at the terminal
  bow1: [["nisha", 0, "Ask each lead for one risk and one need. Then nobody leaves without knowing what they own."], ["arjun", 1, "The usual round is quick, but I would add one question: what could go wrong in your area today?"]],
  bow2: [["arjun", 0, "Patch this week, in a quiet slot, with a way to undo it. Known holes are the cheapest way in for an attacker."], ["raghav", 1, "If the week is too tight, next month is a fair compromise. Just do not let it slip again."]],
  bow3: [["raghav", 0, "A backup nobody has restored is only a hope. Rebuild one system from the offline copy and time it."], ["arjun", 1, "A green status shows the job ran, not that the data comes back. I would still try one restore."]],
  bow4: [["isha", 0, "Give them a named person and a paper phone list. That works even when our systems are down."], ["nisha", 0, "I agree: the general inbox only works while the systems are up. An afternoon on a paper list is worth it."]],
  bow5: [["kavya", 0, "Run the drill at the quietest hour. We will find out which forms do not work while it is cheap to fix them."], ["worker", 1, "A short briefing is easier on the queue, but we have never actually checked trucks in on paper."]],
  bow6: [["raghav", 0, "Approve all of it and ask for the order of work. Separating the office and yard networks is what stops a spread."], ["arjun", 1, "Half now is better than nothing, but the links left open are still a way across."]],
  bow7: [["nisha", 0, "Phone the second carrier today and write their number on the paper list. It is cheap insurance."], ["isha", 1, "I would at least note it for next week, but nothing is agreed until someone calls."]],
  // ------------------------------------------------------------ Bhopal: a normal day at the plant
  bw1: [["kavya", 0, "Walk the open permits with me. I want you to see that every interlock is really back in service."], ["worker", 1, "Reading the log is the normal routine, but it only covers what Marta remembered to write."]],
  bw2: [["worker", 0, "Take the bypass off and run the alarm test now. It is overdue, and someone should own the next one."], ["kavya", 1, "Booking it for next week is tempting, but the unit runs unprotected until then."]],
  bw3: [["worker_d", 0, "Thank me and log it as a near miss. Then tell the whole shift, so the next person speaks up too."], ["kavya", 1, "Fixing the valve is right. If you keep it quiet, nobody else learns from it."]],
  bw4: [["worker_b", 0, "Say no to the bypass but give us a booked window. We do the job safely, just later."], ["worker", 1, "A supervisor watching helps, but a person is not the same as the alarm."]],
  bw5: [["worker_c", 0, "Send savings that stay away from safety items and attach the risk register. It will be a hard call, but an honest one."], ["kavya", 0, "Please do not tell head office that safety will not be affected unless you are sure. We are already thin."]],
  bw6: [["nisha", 0, "A plain explanation and a one-page card would help me. I would come to an open day."], ["worker", 1, "Telling her it is a test is true, but she will not know what to do if it is real."]],
  bw7: [["raghav", 0, "Run the mock exercise. People remember the siren and the radio far better than slides."], ["kavya", 1, "If the hour is short, walk the route at least. But a drill is what makes it stick."]],
  // ------------------------------------------------------------ Bhopal: the historical record
  h1: [["arjun", 0, "Look at who lives beside the plant. The danger depends on who could be hurt, not only on the chemical."], ["worker", 1, "Insurance matters, but it counts the cost after the harm, not who gets hurt."]],
  h2: [["arjun", 0, "Layers only work if they are kept working, tested and not switched off together."], ["worker", 1, "One strong barrier sounds enough, but when it fails nothing is left behind it."]],
  h3: [["arjun", 0, "Savings on maintenance and staff quietly remove safety margins. They deserve a safety review."], ["worker", 1, "Budgets are tight everywhere, but accepting the cuts without review is how margins disappear."]],
  h4: [["arjun", 0, "Treat each warning as evidence: give it an owner and a deadline and follow it to closure."], ["worker", 1, "Fixing things when budget allows is common, but that is how findings pile up unfixed."]],
  h5: [["arjun", 0, "Separate what is well established from what is disputed. Learn from both and do not hide behind the dispute."], ["worker", 1, "Choosing the most convincing story is easy, but then you stop looking at the rest."]],
  h6: [["arjun", 0, "Hazard information must reach doctors, responders and neighbours before anything happens."], ["worker", 1, "Reviewing it first sounds careful, but it delays the people who need to act."]],
  h7: [["arjun", 0, "Harm outlasts the event. Prevention, honest reporting and care for survivors all stay part of the job."], ["worker", 1, "Compensation matters, but it does not close the question of prevention."]],
  // ------------------------------------------------------------ Bhopal: the crisis
  f1: [["arjun", 0, "Stop adding product until cooling is back and the scrubber and flare are load-tested. It costs output, but these are the barriers."], ["kavya", 1, "Cooling first is right. I would not leave the scrubber and flare untested for a whole quarter."]],
  f2: [["worker_c", 0, "Protect the safety-critical roles and review the rest. Head office will push back, so bring the competency review."], ["raghav", 1, "Cross-training and a night supervisor make cuts safer, but they are a weaker answer than keeping the key roles."]],
  f3: [["worker_d", 0, "Halt transfers, isolate the line and fix the gauge. And tell us what happened, we are the ones standing there."], ["worker", 1, "Extra manual checks keep the schedule, but we would still be working with a gauge we do not trust."]],
  f4: [["nisha", 0, "Run a drill with the authorities and put in an alarm we can hear. Tell us what to do in plain words."], ["kavya", 1, "A leaflet helps, but practising together is what makes people act."]],
  f5: [["worker_b", 0, "Start the emergency procedure and sound the alarm, then investigate. A false alarm costs less than a late one."], ["kavya", 1, "Sending the night team to check is reasonable, but thirty minutes is a long time if it is real."]],
  f6: [["nisha", 0, "Report everything and publish the review. That is how we, the neighbours, learn to trust you."], ["raghav", 1, "Reporting to the regulator is the minimum. Keeping the review private means nobody else learns from it."]],
  // ------------------------------------------------------------ Hospital: a normal day on the ward
  cw1: [["kavya", 0, "Use the sheet, read each plan back and ask the night team what worried them. A checklist will not tell you that."], ["isha", 1, "Notes on the two sickest patients are a start, but I would ask about the others too."]],
  cw2: [["isha", 0, "Let me present and lead the plans. Step in to teach and tell me why, that is how I learn."], ["kavya", 1, "Presenting yourself and explaining aloud works, but she will not get to try."]],
  cw3: [["arjun", 0, "Walk to the store and count it. Set minimum levels and a standing order, then it stops being a surprise."], ["kavya", 1, "Asking for more next week helps later, but nobody knows how low we are now."]],
  cw4: [["nisha", 0, "Sit with me, tell me what you know and what you do not, and promise a time for the next update. Then keep it."], ["kavya", 1, "A nurse calling is kind, but give her a time. Waiting without one is what frightens people."]],
  cw5: [["worker_c", 0, "Bring the occupancy numbers and propose closing a few beds, with a written plan to reopen the rest. I can work with that."], ["raghav", 1, "Accepting the cut with a six-month review is quick, but it leaves no plan if we need the beds sooner."]],
  cw6: [["kavya", 0, "Fix the rota: swap rules, a floating nurse, and protected breaks. I need real hours, not kind words."], ["isha", 1, "Thanks are welcome, but the night shifts do not change until the rota does."]],
  cw7: [["raghav", 0, "Spend the hour and draft simple, fair criteria with the team. It is far easier to decide before the wards are full."], ["kavya", 1, "Leaving it with Dr. Hakim means it gets written, but the people who must use it have no say."]],
  // ------------------------------------------------------------ Hospital: the crisis
  c1: [["raghav", 0, "Set up triage with agreed criteria and name a lead per shift. It takes an hour, but then everyone follows the same rules."], ["kavya", 1, "A senior doctor deciding case by case is fast, but it all depends on one person being there."]],
  c2: [["worker_c", 0, "Reopen the wing as a step-down area with clear criteria and arrange transfers with the neighbouring hospital."], ["kavya", 1, "Pulling nurses from the wards fills the wing fast, but it leaves those wards thin."]],
  c3: [["kavya", 0, "Write a protection plan with infection control, give the best kit to the highest-risk areas and refuse anything uncertified."], ["isha", 0, "Uncertified masks look like a fix, but nobody knows whether they protect us."]],
  c4: [["worker_b", 0, "Audit how oxygen is used and escalate to the supplier and the district office. Use it where it is needed."], ["worker_c", 1, "Asking the supplier to hurry is a start, but we should also watch how much we use."]],
  c5: [["isha", 0, "Apply the agreed criteria, ask the on-call senior colleague, write down the reasons and tell both families honestly."], ["kavya", 1, "Deciding alone is quick, but with no criteria and nobody to check it is a lot to carry."]],
  c6: [["nisha", 0, "A family liaison, set update times and video calls where possible. Just tell us plainly how he is."], ["kavya", 1, "Updating when a doctor can spare the time is flexible, but some families hear often and some never."]],
  c7: [["kavya", 0, "Mandatory rest rotation, extra staff and peer support. We are tired, and a thank-you will not fix that."], ["isha", 1, "A public thank-you is kind, but asking us to push through changes nothing about the hours."]],
  c8: [["raghav", 0, "Hold a structured debrief, update the protocols and share what we learned with the neighbouring hospitals."], ["kavya", 1, "A thank-you meeting is warm, but if nothing is written down the next surge starts from zero."]],
};

/**
 * What EVERY person in a step thinks of its options: the option they back and why, and (where they have one) the option they argue against and why.
 * Written once for all the steps (workdayOpinions.json), from each step's own situation and options, and shown under the options so the player decides with the team's views in front of them.
 * `for` is null for a person who takes no side (they are neutral and just say what they think). `for` / `against` are option kinds (the end of the option id), because the order of the options on screen changes from run to run.
 */
export interface Opinion { for: "strong" | "mixed" | "weak" | null; say: string; against: "strong" | "mixed" | "weak" | null; why: string | null }
export const OPINIONS = opinions as Record<string, Partial<Record<SpriteWho, Opinion>>>;
