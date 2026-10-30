import type { ComicPageData } from "../comic/types";
import { sanitizePage } from "../comic/validate";

// Plain-language layer. The story, the choices, the numbers and the consequences all still come from the backend; this file only says the same
// things in short, everyday words, and says what is going on and what the player has to decide. Anything not listed here falls back to the
// backend's own wording, so nothing is lost if the scenario changes.

export interface RoundPlain { where: string; problem: string; job: string }
export const ROUND_PLAIN: Record<number, RoundPlain> = {
  1: { where: "8:40 PM. You run emergency operations at a company that makes hospital monitoring equipment.", problem: "Every computer in the warehouse just went dead, and someone who is not staff has been logging in. Nobody knows yet if it is a cyberattack.", job: "Decide how to get the systems back: shut the affected ones down safely, bring them back step by step, or restart everything right now." },
  2: { where: "9:05 PM. The computers are still unreliable.", problem: "Smoke is coming from an electrical panel behind the control room. Nobody knows how bad it is.", job: "Decide how to keep people safe: clear everyone out, rope it off for the electrician, or ignore it and keep working." },
  3: { where: "9:35 PM. Heavy monsoon rain.", problem: "The main road to the hospitals is flooded, so our trucks cannot use it. We still have to deliver.", job: "Decide how to get stock out: hire special trucks (costs money), go through another depot (not confirmed yet), or keep the few trucks that can get through for hospitals only." },
  4: { where: "10:15 PM. The computer says we have 480 items in stock.", problem: "The computer and the hand count do not agree. The computer's numbers may be wrong.", job: "Decide whether to wait for a full count, ship batches as they are double-checked, or trust the computer for now." },
  5: { where: "11:00 PM. You have a limited emergency budget.", problem: "Once the money is spent, it is gone. Repairs, IT, trucks and a backup depot all need it.", job: "Decide how much to spend now, and on what." },
  6: { where: "11:45 PM. The investigation found a clue.", problem: "The strange logins came from an account that belongs to a partner delivery company. That does not prove they did it: their account may have been hacked too.", job: "Decide how to react: block the account, bring in outside experts, or keep restoring while you investigate." },
  7: { where: "1:00 AM. Time is running short.", problem: "Two hospitals urgently need monitors. Another customer has a big order and will charge a penalty if it is late. There is not enough for everyone.", job: "Decide who gets stock first." },
  8: { where: "2:20 AM. A new problem.", problem: "The backup power is failing, and the other depot cannot confirm everything it is holding.", job: "Decide whether to move stock, keep a small crew working, or stop everything and check." },
  9: { where: "4:10 AM. The news is out.", problem: "Reporters know equipment is missing and are asking if it was a cyberattack. You do not have all the facts yet.", job: "Decide what to tell the public, and when." },
  10: { where: "6:00 AM. This is the last decision.", problem: "The trucks are waiting and the shipment must leave now. Some stock is confirmed; some is only on the computer.", job: "Decide what goes out: only confirmed stock, a quick final check first, or everything the computer lists." },
};

export const PANEL_PLAIN: Record<string, { note?: string; say?: string }> = {
  r1a: { note: "8:40 PM — Every computer screen in the warehouse goes dark at the same time." },
  r1b: { note: "Arjun runs the IT systems. He has found something strange.", say: "The scanners are dead. And someone who is not staff has been logging in." },
  r1c: { note: "Arjun cannot say yet whether it is an attack.", say: "I can't tell what this is yet. But it is not normal." },
  r2a: { note: "9:05 PM — Smoke is rising from electrical panel 4." },
  r2b: { note: "Kavya, the safety chief, wants everyone away from the panel.", say: "Stay away from that panel until someone has checked it!" },
  r3a: { note: "9:35 PM — The main road is under floodwater." },
  r3b: { note: "Raghav manages deliveries. He has three ways to move stock, and each has a catch.", say: "The road is under water. I have three ways to move stock, but none is perfect." },
  r3c: { note: "Raghav's information about the other depot is a few hours old.", say: "My depot information is from this evening. It is probably right, but I can't be sure." },
  r4a: { note: "The computer shows 480 items. Workers have only counted half the shelves.", say: "The computer says 480 items. We have only counted half the shelves." },
  r4b: { note: "You have to decide which number to believe.", say: "The computer says 480. But what is really on the shelves?" },
  r5a: { note: "Nisha is the finance director. She controls the emergency money.", say: "We have ₹12 lakh for tonight. If we spend it now, we will have none left at 4 AM." },
  r5b: { note: "You cannot pay for everything.", say: "Trucks, IT, repairs, a depot... we can't afford all of it." },
  r6a: { note: "11:45 PM — A clue, but not proof.", say: "The logins came from a partner delivery company's account, right when the outage began." },
  r7a: { note: "Dr. Isha Kapoor speaks for the hospitals.", say: "Two hospitals will run out of monitors within hours. And another customer is demanding penalties." },
  r7b: { note: "There is not enough stock for everyone.", say: "Everyone wants stock. But only the hospitals have patients waiting." },
  r8a: { note: "2:20 AM — The lights flicker. The backup generator is failing." },
  r8b: { note: "Kavya is worried about the generator.", say: "If the generator cuts out while people are inside, there will be no warning." },
  r8c: { note: "Raghav is at the other depot, calling on the radio.", say: "I can't confirm half of the storage bays here." },
  r9a: { note: "4:10 AM — News headline: equipment missing, cyberattack suspected." },
  r9b: { note: "Dr. Kapoor says the hospitals have seen the news.", say: "The hospitals are calling. They have seen the news." },
  r10a: { note: "6:00 AM — The delivery trucks are waiting with their engines running.", say: "Tell me what is on the list and I will get the trucks out of the gate." },
};

/** means: what the option does, in plain words. done: what you did, for the "so far" recap. result: what happened, in plain words. */
export const CHOICE_PLAIN: Record<string, { means: string; done: string; result: string }> = {
  r1_isolate: { means: "Unplug the affected computers and save the evidence. Slower, but you keep proof of what happened.", done: "shut down the affected systems and kept the evidence", result: "The systems are safe and the evidence is kept. It cost some time and work capacity." },
  r1_controlled: { means: "Bring the computers back a little at a time while watching closely. Faster, but the problem may not be fully shut out.", done: "restarted the systems in careful stages", result: "The systems are coming back under watch, but the problem is not fully shut out." },
  r1_rush: { means: "Restart everything immediately. Fastest, but it erases evidence and the problem may come back.", done: "restarted everything straight away", result: "Everything runs again fast, but evidence was erased and the problem was never shut out." },
  r2_evacuate: { means: "Get everyone out and call the fire service and electricians. Safest, but work slows down.", done: "cleared the area and called the experts", result: "Everyone is out and the experts have checked it. Work slowed down, but nobody was at risk." },
  r2_secure: { means: "Rope the area off and let the licensed electrician check it. Quicker, with a small risk.", done: "roped off the area for the electrician", result: "The area is roped off and being checked by qualified staff. There is still a small risk." },
  r2_maintain: { means: "Keep working elsewhere and do not check the panel. Risky: nobody qualified has looked at it.", done: "kept working without checking the panel", result: "Work goes on, but nobody qualified has checked the danger." },
  r3_alt_transport: { means: "Hire special trucks that can drive through water. Costs a lot, but the capacity is certain.", done: "hired special flood-proof trucks", result: "You hired trucks that can carry 300 units. It cost a lot of money." },
  r3_divert_depot: { means: "Send stock through another depot. Cheaper, but we do not know yet if that depot is usable.", done: "rerouted stock through the other depot", result: "Stock will go through the other depot (about 240 units), if Raghav's scouts find it usable." },
  r3_reserve_hospital: { means: "Use the few trucks that can get through only for hospital deliveries. Everyone else waits.", done: "kept the few trucks for hospital deliveries", result: "A small group of trucks (170 units) is kept for hospitals. Other customers will have to wait." },
  r4_pause: { means: "Stop all shipments until everything has been counted by hand. Slow, but accurate.", done: "stopped shipping until a full count was done", result: "The full count confirms a lot of stock, but it took over an hour." },
  r4_release_verified: { means: "Ship each batch as soon as it has been double-checked. A good balance of speed and safety.", done: "shipped only batches that had been double-checked", result: "A good share of the stock is confirmed and can leave. The rest is still uncertain." },
  r4_provisional: { means: "Trust the computer's numbers for now and check later. Fast, but the numbers may be too high.", done: "trusted the computer's numbers for now", result: "The computer's numbers add extra stock on paper, but it is not confirmed and may be wrong." },
  r5_minimal: { means: "Spend only ₹1 lakh on the essentials and keep the rest for later. Safe, but recovery is slow.", done: "spent very little and saved the rest", result: "You kept most of the money for later, but recovery is slow." },
  r5_balanced: { means: "Spend ₹6 lakh on repairs, IT and some extra transport, and keep a reserve.", done: "spent on repairs, IT and some transport, and kept a reserve", result: "The building and the systems improve, and you still have money in reserve." },
  r5_restoration: { means: "Spend ₹8.5 lakh on repairs, IT and outside experts. Fast recovery, but almost no money left.", done: "spent most of the budget on repairs and IT", result: "Systems and the building recover quickly, but most of the money is gone." },
  r5_logistics: { means: "Spend ₹6 lakh on more trucks and a checked backup depot. Delivery improves; recovery is slower.", done: "put the money into trucks and a backup depot", result: "You can now move much more stock, and the depot is confirmed. Repairs are lagging." },
  r5_negotiated: { means: "Spend ₹4 lakh now and pay the rest later on an invoice. More gets done now, but a bill comes due at 4 AM.", done: "paid part now and the rest later on an invoice", result: "A lot is covered now, but a ₹2 lakh bill will arrive later." },
  r6_restrict: { means: "Block the partner's account and isolate what it touched, without blaming anyone.", done: "blocked the suspicious account", result: "The account is blocked and the systems are safer. The partner company is unhappy." },
  r6_specialist: { means: "Hire an outside cyber-security team (₹2 lakh).", done: "hired outside cyber-security experts", result: "The experts protect the evidence and help the recovery." },
  r6_parallel: { means: "Keep restoring the systems and investigate at the same time. Faster, but harder to keep the evidence clean.", done: "kept restoring while investigating", result: "Restoration goes on, but investigating a live system damages evidence." },
  r7_hospital_first: { means: "Hospitals get stock first, even though the other customer will charge a penalty.", done: "sent stock to the hospitals first", result: "The hospitals get their stock first. The other customer will charge a penalty." },
  r7_commitments: { means: "Send orders in the order they were placed. Hospitals get what is left.", done: "followed the original order list", result: "Contracts are honoured, but the hospitals are served last." },
  r7_negotiate: { means: "Offer everyone part of their order now and the rest later. Works only if customers still trust you.", done: "offered everyone part of their order now", result: "If customers still trust you, this works. If not, it backfires." },
  r8_transfer: { means: "Move stock to the backup depot, closer to the road. Costs ₹1 lakh.", done: "moved stock to the backup depot", result: "You can carry more, but the moved stock must be checked again." },
  r8_restricted: { means: "Keep a small crew working under safety rules. The failing power is a risk.", done: "kept a small crew working", result: "Some work continues, but the weak backup power is a danger." },
  r8_suspend: { means: "Stop everything, check safety and stock, then restart. Safest, but you lose about an hour.", done: "stopped to check safety and stock", result: "Everything is checked and safer, but you lost an hour." },
  r9_holding: { means: "Tell the public what you know, what you do not know, and when you will update them.", done: "gave a short, honest statement", result: "A short, honest statement helps keep the public's trust." },
  r9_wait: { means: "Say nothing until all the facts are in. People may think you are hiding something.", done: "stayed silent until the facts were in", result: "Silence looks like hiding something, and trust drops." },
  r9_briefing: { means: "Your team leads speak together with one voice. Works only if they all agree.", done: "held a joint briefing with the team leads", result: "A united message reassures people, unless your leads disagree with it." },
  r10_verified: { means: "Ship only stock that has been physically confirmed.", done: "shipped only confirmed stock", result: "Only confirmed stock leaves the gate." },
  r10_sweep: { means: "Take 30 minutes to physically check the remaining stock, then ship.", done: "did a final check before shipping", result: "A last check confirms some extra stock before the trucks leave." },
  r10_provisional: { means: "Ship everything the computer says exists, even unconfirmed items. If a record is wrong, customers will see a shortage.", done: "shipped including unconfirmed items", result: "Unconfirmed items ship too. Any wrong record will show up as a shortage." },
};

export const EVENT_PLAIN: Record<string, string> = {
  secondary_interruption: "The systems crash again", secondary_interruption_partial: "A small crash", flare_up: "The panel bursts into flames",
  panel_failure_evacuated: "The panel fails, but nobody is hurt", panel_failure_assessed: "The panel fails during the check", dock_flooding: "Floodwater reaches the loading dock",
  depot_scout_report: "The scouts report on the other depot", provisional_shortage: "The computer counted too many items", hospital_escalation: "Dr. Kapoor raises the alarm",
  insurer_advance: "The insurer sends money early", reinfection_alert: "The attacker's access comes back", verified_route_pays_off: "The checked route works better",
  contract_penalty_notice: "A penalty bill arrives", power_dip: "Backup power drops", credit_due: "The delayed bill is due",
};

/** Words the player may not know, explained once. Shown only when the round's text uses them. */
export const GLOSSARY: { term: string; match: RegExp; means: string }[] = [
  { term: "Unit", match: /\bunits?\b/i, means: "One piece of medical equipment, for example one patient monitor." },
  { term: "Verified", match: /\bverif(?:y|ied|ication)\b/i, means: "Checked and confirmed by a person, not just listed on the computer." },
  { term: "Provisional", match: /\bprovisional\b/i, means: "Not confirmed yet. It might be wrong." },
  { term: "Transport capacity", match: /transport capacity/i, means: "How many units our trucks can carry in total." },
  { term: "Time slack", match: /time slack|slack/i, means: "Spare minutes before the 6:00 AM deadline. Every action uses some." },
  { term: "Containment", match: /contain(?:ment|ed)?\b/i, means: "Stopping a problem from spreading." },
  { term: "Evidence quality", match: /evidence/i, means: "How well we can prove what happened. Restarting things carelessly destroys it." },
  { term: "Logs / logins", match: /\blogs?\b|login|authentication/i, means: "The computer's record of who signed in, and when." },
  { term: "3PL", match: /3PL|third-party/i, means: "A partner company that handles deliveries for us." },
  { term: "Incident response", match: /incident[- ]response/i, means: "Outside experts who deal with cyberattacks." },
  { term: "Reconciliation", match: /reconcil/i, means: "Matching the computer's numbers against the real count." },
  { term: "Manifest", match: /manifest/i, means: "The list of what is on the truck." },
  { term: "Holding statement", match: /holding statement/i, means: "A short public message that says what we know so far." },
  { term: "Reinfection", match: /reinfect|resurfac/i, means: "The attacker getting back into the systems." },
  { term: "Lakh", match: /lakh|₹/i, means: "₹1 lakh is 100,000 rupees." },
  { term: "Penalty", match: /penalt/i, means: "Money we owe a customer when we deliver late." },
  { term: "Invoice", match: /invoice/i, means: "A bill to be paid later." },
  { term: "Restricted operations", match: /restricted operations/i, means: "Working with only a small crew, under safety rules." },
  { term: "Labour", match: /\blabou?r\b/i, means: "How many workers are available." },
  { term: "Depot", match: /depot/i, means: "A storage and loading site. The alternate depot is our backup site." },
];

/** The same page with simpler words: a short note on every panel, and speech that says the same thing more plainly. Unknown panels are left as they are. */
export function plainPage(page: ComicPageData | unknown): ComicPageData {
  const safe = sanitizePage(page).page;
  return {
    ...safe,
    panels: safe.panels.map((p) => {
      const plain = PANEL_PLAIN[p.id];
      if (!plain) return p;
      return {
        ...p,
        narration: plain.note ?? p.narration,
        dialogue: p.dialogue.map((d, i) => (i === 0 && plain.say ? { ...d, text: plain.say } : d)),
      };
    }),
  };
}

export const plainRound = (round: number | undefined): RoundPlain | undefined => (round === undefined ? undefined : ROUND_PLAIN[round]);
export const eventTitle = (id: string, fallback: string): string => EVENT_PLAIN[id] ?? fallback;
export const choiceResult = (id: string, fallback: string): string => CHOICE_PLAIN[id]?.result ?? fallback;
