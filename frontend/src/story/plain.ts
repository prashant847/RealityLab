import type { ComicPageData } from "../comic/types";
import { sanitizePage } from "../comic/validate";

// The plain-language layer. The backend's own wording is already written in everyday words, so this file only adds what the player needs to
// orient themselves: where the story is, what is wrong and what the decision is (the briefing card), a short line for the story-so-far recap,
// and the glossary. Anything not listed here falls back to the backend text.
//
// Evidence labels used on screen: DOCUMENTED (a historical fact), RECONSTRUCTED (a plausible dramatisation) and SIMULATION (an invented
// decision or hypothetical outcome). See docs/NOTPETYA_OUTLINE_v2.md.

export type Evidence = "documented" | "reconstructed" | "simulation";
export interface RoundPlain { where: string; problem: string; job: string; label: Evidence; record?: string }

export const ROUND_PLAIN: Record<number, RoundPlain> = {
  1: { where: "Tuesday 27 June 2017, Day 1. You lead the recovery effort at a global shipping company.",
    problem: "Computers are failing across the company, one after another, and the failures spread between machines.",
    job: "Decide how to react to a spreading failure: cut it off and keep the evidence, recover in stages, or restore everything at once.",
    label: "reconstructed", record: "Documented: staff saw devices go dark worldwide, then servers. Maersk later said its systems were shut down and the attack was contained on 28 June." },
  2: { where: "Day 1, still 27 June. At the container terminals.",
    problem: "The cranes and gates have lost the systems that tell them what to do. Work falls back to paper and radios.",
    job: "Decide who may keep working: clear the area, have a qualified lead check it, or carry on without a safety check.",
    label: "simulation", record: "Documented: operations fell back to manual processes. The safety incident that can follow here is invented; no injuries are documented in the sources used." },
  3: { where: "Day 2, Wednesday 28 June. The company says the attack is contained.",
    problem: "Trucks keep arriving at terminals that cannot process them. Normal routes are jammed.",
    job: "Decide how to move cargo: pay for extra capacity, divert through another site that is not confirmed, or save the usable vehicles for urgent cargo.",
    label: "simulation", record: "Documented: Maersk reported it was contained on 28 June. How cargo was rerouted is not documented in the sources used." },
  4: { where: "Days 2 to 3. Nobody can say exactly what is where.",
    problem: "The last reliable report lists 480 cargo lots, but the yard count by hand does not agree with it.",
    job: "Decide whether to pause for a full count, release batches as they are confirmed, or trust the old records for now.",
    label: "reconstructed", record: "After a wipe, records cannot be trusted. This is a reasonable inference, not a documented fact. The numbers here are simulation scale." },
  5: { where: "Days 3 to 5. A huge rebuild is under way.",
    problem: "Transport, IT recovery, site repairs, a temporary site and outside help all need effort. There are only 12 points of recovery effort.",
    job: "Decide how much effort to spend now, and on what. What you spend cannot be spent later.",
    label: "simulation", record: "Documented: the chairman later said Maersk reinstalled 4,000 servers, 45,000 PCs and 2,500 applications in a 'heroic effort over ten days'." },
  6: { where: "Days 2 to 6, alongside recovery. The investigation has a clue.",
    problem: "The failures began soon after a trusted third-party software update was installed. That is suspicious, but it is not proof of who did it.",
    job: "Decide how to respond: block the update route, bring in outside specialists, or keep restoring while you investigate.",
    label: "reconstructed", record: "Widely reported: the malware spread through a poisoned update to Ukrainian tax software. It looked like ransomware but wiped data, so paying could not bring anything back." },
  7: { where: "Days 5 to 8. Capacity is short.",
    problem: "Customers with urgent cargo are waiting, and a key account is threatening a penalty unless its order ships as promised.",
    job: "Decide whose cargo goes first, or offer everyone part of their order.",
    label: "simulation", record: "The sources used do not describe how Maersk prioritised cargo. This decision is a simulation." },
  8: { where: "Days 5 to 9. The recovery rests on a few surviving pieces.",
    problem: "Backup power at the recovery site is unreliable, and the alternate site cannot confirm everything it holds.",
    job: "Decide whether to move verified work to the alternate site, keep a small crew working, or pause everything for checks.",
    label: "simulation", record: "Reported, not verified here: a domain controller in Ghana survived because a power outage had left it offline. The rest of this round is a simulation." },
  9: { where: "Days 6 to 10. The news is out.",
    problem: "Reporters ask whether this is a cyberattack and when services will return. You do not have every fact.",
    job: "Decide what to say: a short factual statement, silence until the facts are in, or a joint briefing.",
    label: "reconstructed", record: "Documented: Maersk made public statements from 27 June, said a recovery plan was under way, and said no data breach to third parties had occurred." },
  10: { where: "About Day 10. The core systems are back.",
    problem: "The gates are about to reopen. Some cargo is confirmed; some is only on old records.",
    job: "Decide what moves: only what is verified, one last check first, or everything including the doubtful records.",
    label: "simulation", record: "Documented: the chairman put the core rebuild at ten days. Other reports say bookings mostly resumed after about eight days and full restoration took about four weeks." },
};

/** One line per choice for the story-so-far recap ("You ..."). */
export const CHOICE_PLAIN: Record<string, { done: string }> = {
  r1_isolate: { done: "cut the affected connections and kept the evidence" },
  r1_controlled: { done: "recovered in stages while watching the spread" },
  r1_rush: { done: "brought everything back online as fast as possible" },
  r2_evacuate: { done: "cleared the affected area and brought in the safety team" },
  r2_secure: { done: "cordoned the area and had a qualified lead check it" },
  r2_maintain: { done: "kept working manually with no formal safety check" },
  r3_alt_transport: { done: "paid for extra transport capacity" },
  r3_divert_depot: { done: "diverted cargo through another site that was not confirmed" },
  r3_reserve_hospital: { done: "kept the few usable vehicles for the most urgent cargo" },
  r4_pause: { done: "paused releases until a full count was done" },
  r4_release_verified: { done: "released batches as each was confirmed" },
  r4_provisional: { done: "used the last records provisionally and checked later" },
  r5_minimal: { done: "spent only the essentials" },
  r5_balanced: { done: "funded a balanced package of repairs, IT and some transport" },
  r5_restoration: { done: "committed heavily to restoration and repairs" },
  r5_logistics: { done: "put logistics first, with extra transport and a temporary site" },
  r5_negotiated: { done: "negotiated payment terms and paid part of the cost later" },
  r6_restrict: { done: "blocked the third-party update path and contained what it reached" },
  r6_specialist: { done: "brought in outside incident specialists" },
  r6_parallel: { done: "kept restoring while investigating in parallel" },
  r7_hospital_first: { done: "put verified time-critical cargo first" },
  r7_commitments: { done: "followed existing order commitments" },
  r7_negotiate: { done: "negotiated partial deliveries across customers" },
  r8_transfer: { done: "moved verified work to the alternate site" },
  r8_restricted: { done: "kept a minimal crew working under restrictions" },
  r8_suspend: { done: "paused everything until the checks were complete" },
  r9_holding: { done: "issued a short factual holding statement" },
  r9_wait: { done: "waited until more facts were established" },
  r9_briefing: { done: "arranged a joint briefing with the incident leads" },
  r10_verified: { done: "reopened on verified cargo only" },
  r10_sweep: { done: "did one last physical check before reopening" },
  r10_provisional: { done: "reopened including the provisional records" },
};

export const GLOSSARY: { term: string; match: RegExp; means: string }[] = [
  { term: "Cargo lot", match: /cargo lots?|\blots?\b/i, means: "A made-up unit for counting cargo in this simulation. It is not a real container count." },
  { term: "Recovery points", match: /recovery points|points of (?:recovery )?effort|\bpoints\b/i, means: "A made-up measure of how much effort you can spend. It is not real money." },
  { term: "Verified", match: /\bverif(?:y|ied|ication)\b/i, means: "Checked and confirmed by a person, not just listed in a system." },
  { term: "Provisional", match: /\bprovisional\b/i, means: "Not confirmed yet. It might be wrong." },
  { term: "Transport capacity", match: /transport capacity/i, means: "How many cargo lots the available vehicles can carry in total." },
  { term: "Containment", match: /contain(?:ment|ed)?\b/i, means: "Stopping a problem from spreading." },
  { term: "Evidence", match: /evidence|logs?\b/i, means: "The record of what happened. Restoring things carelessly can destroy it." },
  { term: "Third-party software update", match: /third-party|update route|update path/i, means: "A software update that came from an outside supplier your systems trust." },
  { term: "Incident specialists", match: /incident (?:specialists|response)|specialists/i, means: "Outside experts who deal with cyberattacks." },
  { term: "Holding statement", match: /holding statement/i, means: "A short public message that says what we know so far and when we will update." },
  { term: "Time-critical customers", match: /time-critical|urgent customers|urgent cargo/i, means: "Customers whose cargo cannot wait. This is a simulation category, not a documented group." },
  { term: "Key account", match: /key account/i, means: "A large customer with a contract. It may charge a penalty if its order is late." },
  { term: "Penalty", match: /penalt/i, means: "A payment owed to a customer for delivering late." },
  { term: "Restricted operations", match: /restricted (?:operations|work)/i, means: "Working with only a small crew, under safety rules." },
  { term: "Reinfection", match: /reinfect|resurfac/i, means: "The attack getting back into systems that were cleaned." },
  { term: "Alternate site", match: /alternate (?:site|depot)/i, means: "A backup location we can route work or cargo through." },
];

/** The same page, cleaned and validated. Unknown panels pass through unchanged. */
export function plainPage(page: ComicPageData | unknown): ComicPageData {
  return sanitizePage(page).page;
}

export const plainRound = (round: number | undefined): RoundPlain | undefined => (round === undefined ? undefined : ROUND_PLAIN[round]);
export const eventTitle = (_id: string, fallback: string): string => fallback;
export const choiceResult = (_id: string, fallback: string): string => fallback;
