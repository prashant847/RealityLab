import type { SpritePose, SpriteWho } from "../../comic/stick/StickSprite";
import type { Step } from "../../api/sims";
import { OPINIONS } from "./workdayAdvice";
import { compose, type Mood, type Reaction } from "../../comic/stick/reaction";

/**
 * Every step of the four profession simulations that are told in the crisis layout (BLACKOUT's normal day, Bhopal's day and crisis, the hospital's day and
 * crisis) as a comic: each step is set in its own room (a picture made with ElevenLabs, public/assets/scene/workday/<step>.webp), played by the same stickmen
 * as BLACKOUT's crisis. The words on the pages come from the step itself (its brief, facts, question and the colleague's line); only the staging and the
 * colleagues' replies to each choice are written here. Nothing in this file decides an outcome.
 */
export type Sim = "blackout" | "bhopal" | "covid";
export interface Person { name: string; role: string }
export interface Place { who: SpriteWho; x: number; flip?: boolean }
export interface WorkdayStep {
  sim: Sim; bg: string; cast: Place[];
  /** Where the feet stand, in percent of the picture's width above its bottom edge, so that people stand on the floor and not on furniture. */
  fl?: number;
  /** How big the people are against this picture (1 = full size). Smaller where houses or machines behind them would otherwise look tiny next to a person. */
  fs?: number;
  /** Safe places for the three people of the reaction scene (the lead, the bystander, the colleague), where the default places would put someone on an object. */
  spots?: [number, number, number];
  /** The colleague this step is about, who asks the question and answers the choice, and one more person in the room. */
  adv: SpriteWho; third: SpriteWho;
  /** Names for this step where the usual name for a sprite does not fit (an auditor, the regulator, a supplier on the phone). */
  names?: Partial<Record<SpriteWho, string>>;
  /** For a generated simulation: who everyone is in this step (it has its own team, not one of the built-in ones). */
  people?: Partial<Record<SpriteWho, Person>>;
  replies: { strong: string; mixed: string; weak: string; third: string };
}

/** Who each stickman is, in each profession. The player is always the lead (`director`). */
export const PEOPLE: Record<Sim, Partial<Record<SpriteWho, Person>>> = {
  blackout: {
    director: { name: "Recovery Team Lead", role: "You" }, kavya: { name: "Terminal Supervisor", role: "Site safety and terminal operations" }, arjun: { name: "IT Lead", role: "IT systems and security" },
    nisha: { name: "Operations Manager", role: "Operations and recovery planning" }, raghav: { name: "Network Administrator", role: "Networks, connections and routes" },
    isha: { name: "Customer Representative", role: "Customers and communication" }, worker: { name: "Gate staff", role: "Checks trucks in and out" },
  },
  bhopal: {
    director: { name: "Plant Safety Manager", role: "You" }, kavya: { name: "Marta Ilves", role: "Night shift supervisor" }, worker: { name: "Dev Raman", role: "Maintenance lead" },
    worker_d: { name: "Lena Okafor", role: "Operator" }, worker_b: { name: "Sam", role: "Contractor" }, worker_c: { name: "Jonas Berg", role: "Head office, finance" },
    nisha: { name: "Mrs. Aydin", role: "A neighbour of the plant" }, raghav: { name: "Hollis Grant", role: "Plant director" }, arjun: { name: "Safety analyst", role: "Reads the record with you" },
  },
  covid: {
    director: { name: "Duty Medical Lead", role: "You" }, kavya: { name: "Sister Anita Das", role: "Ward nurse lead" }, isha: { name: "Dr. Priya Rao", role: "First-year resident" },
    raghav: { name: "Dr. Farid Hakim", role: "Senior consultant" }, worker_c: { name: "Mr. Rohan Kapoor", role: "Hospital administrator" }, nisha: { name: "Mrs. Verma", role: "A patient's daughter" },
    arjun: { name: "Imran", role: "Hospital porter" }, worker_b: { name: "The supplier", role: "On the phone" },
  },
};

export const FLOOR_DEFAULT = 5.5;
const bg = (id: string) => `${import.meta.env.BASE_URL}assets/scene/workday/${id}.webp`;
const D: Place = { who: "director", x: 34 };
const duo = (who: SpriteWho): Place[] => [D, { who, x: 70, flip: true }];
type R = [string, string, string, string];
const S = (id: string, sim: Sim, cast: Place[], adv: SpriteWho, third: SpriteWho, r: R, names?: WorkdayStep["names"]): [string, WorkdayStep] =>
  [id, { sim, bg: bg(id), cast, adv, third, names, replies: { strong: r[0], mixed: r[1], weak: r[2], third: r[3] } }];

const BASE: Record<string, WorkdayStep> = Object.fromEntries([
  // ------------------------------------------------------------------ BLACKOUT: a Monday at the terminal
  S("bow1", "blackout", [{ who: "director", x: 27 }, { who: "kavya", x: 40 }, { who: "nisha", x: 53 }, { who: "arjun", x: 66 }, { who: "raghav", x: 79, flip: true }, { who: "isha", x: 91, flip: true }], "nisha", "arjun",
    ["Finally a briefing that asks what could go wrong. Now I know what I own.", "Fine. The usual status round, then.", "No meeting? Okay. We'll just work it out as we go.", "Hmm."]),
  S("bow2", "blackout", duo("arjun"), "arjun", "raghav", ["A window this week, with a rollback plan. I'll schedule it today.", "Next month, then. I'll keep it on the list.", "Deferred. I'll write the risk down.", "Ouch."]),
  S("bow3", "blackout", duo("raghav"), "raghav", "arjun", ["A real restore test. I'll time it and write the number on the wall.", "Green lights it is. I'll note that the jobs ran.", "If you say so. They have run every night.", "Hm."]),
  S("bow4", "blackout", duo("isha"), "isha", "nisha", ["A named contact and a phone list. I'll draft it now.", "I'll send them the general address again.", "I'll tell them it has never gone down. They won't love that.", "Oh dear."]),
  S("bow5", "blackout", [{ who: "director", x: 30 }, { who: "kavya", x: 56 }, { who: "worker", x: 84, flip: true }], "kavya", "worker", ["We'll run it at the quietest hour. Paper forms, radios, the lot.", "A briefing, then. I'll gather the team.", "Not now. Right. I won't ask again.", "Hmm."]),
  S("bow6", "blackout", duo("raghav"), "raghav", "arjun", ["I'll start this week and send you the order of work.", "Half now. I'll separate the most exposed link first.", "Next year's list. Understood.", "Hmm."]),
  S("bow7", "blackout", [{ who: "director", x: 34 }, { who: "nisha", x: 74, flip: true }], "nisha", "isha", ["A standby deal with a second carrier. I'll add the number to the contact list.", "I'll look into it next week and make a note.", "It has worked so far. We'll leave the file as it is.", "Hmm."]),
  // ------------------------------------------------------------------ Bhopal: a day at the plant
  S("bw1", "bhopal", duo("kavya"), "kavya", "worker", ["Walking the permits together. That is what I hoped for. Thank you.", "Fine. I'll leave you the log. It's all in there, mostly.", "Oh... thanks. I'll go and get some sleep, then.", "Hmm."]),
  S("bw2", "bhopal", duo("worker"), "worker", "kavya", ["Bypass off and the alarm tested. About time. I'll own the next test.", "Next week, then. We'll have to keep an eye on it.", "Carry on, then. It has run fine for years, I suppose.", "Ouch."]),
  S("bw3", "bhopal", duo("worker_d"), "worker_d", "kavya", ["Thank you. I didn't expect that. I'll tell the others what I saw.", "Thanks for fixing it. I'd rather it wasn't only between us, though.", "Right. I'll be more careful. Next time maybe I won't say anything.", "Oh dear."]),
  S("bw4", "bhopal", [{ who: "director", x: 44 }, { who: "worker_b", x: 76, flip: true }], "worker_b", "worker", ["Not today, then. A booked window and a safe way round. Fair enough.", "Alarm off with someone watching. That works for me.", "Great, alarm off till noon. That's two hours saved.", "Hmm."]),
  S("bw5", "bhopal", duo("worker_c"), "worker_c", "kavya", ["That's a tougher list than I wanted, but the risks are clear. I'll take it up.", "A list, no commentary. That makes my job easier.", "Safety unaffected? Good. Ten percent it is.", "Hmm."]),
  S("bw6", "bhopal", duo("nisha"), "nisha", "worker", ["A card, and an open day. Now I know what to do when it sounds.", "Only a test? Well, if you say so. I'll try not to worry.", "Nothing to worry about. I suppose I'll have to believe you.", "Hmm."]),
  S("bw7", "bhopal", [{ who: "director", x: 30 }, { who: "raghav", x: 56 }, { who: "worker_d", x: 82, flip: true }], "raghav", "kavya", ["A real drill with the alarm and the radios. That's how they will remember it.", "Half a drill. They know the route; they haven't heard the siren.", "Slides, then. At least they'll have seen it.", "Hmm."]),
  // ------------------------------------------------------------------ Bhopal: the record of 1984 (reading the documents, no one speaks for the plant)
  S("h1", "bhopal", duo("arjun"), "arjun", "worker", ["Yes. Who lives nearby decides how much harm a release can do.", "Property and insurance matter, but they are not the main point.", "The chemical alone? Then why would anyone plan for the neighbours?", "Hmm."]),
  S("h2", "bhopal", duo("arjun"), "arjun", "worker", ["Right. Layers only protect if they are kept working, together.", "One strong barrier, until it fails and nothing is behind it.", "Safeguards are not extras. When they go, so does the margin.", "Hmm."]),
  S("h3", "bhopal", [{ who: "director", x: 24 }, { who: "arjun", x: 40, flip: true }], "arjun", "worker", ["Exactly. Cost decisions in a hazardous plant are safety decisions.", "A fixed budget does not make the risk go away.", "Good design still needs people to run and maintain it.", "Hmm."]),
  S("h4", "bhopal", duo("arjun"), "arjun", "worker", ["Every warning tracked to the end, with an owner and a deadline. Yes.", "Joining a long list is how warnings get lost.", "Small leaks are warnings, not normal operation.", "Hmm."]),
  S("h5", "bhopal", duo("arjun"), "arjun", "worker", ["Separate what is established from what is disputed, and learn from both.", "Picking the most convincing version is not the same as knowing.", "A dispute does not erase what is firmly established.", "Hmm."]),
  S("h6", "bhopal", duo("arjun"), "arjun", "worker", ["Share hazard information and plans before an emergency, not after.", "Controlling the message first costs time that people do not have.", "People who live near a plant need to understand its hazards.", "Hmm."]),
  S("h7", "bhopal", duo("arjun"), "arjun", "worker", ["Safety is a continuing responsibility: prevention, honesty and care.", "Compensation does not close the question of prevention.", "It was extreme, but the patterns repeat at every scale.", "Hmm."]),
  // ------------------------------------------------------------------ Bhopal: the crisis at the plant
  S("f1", "bhopal", duo("arjun"), "arjun", "kavya", ["Full restoration and a load test before more product. That is what I hoped to see.", "Cooling now, the rest next quarter. A partial fix, but a start.", "Deferred to the budget cycle. I will note it in the risk register.", "Hmm."], { arjun: "The external auditor" }),
  S("f2", "bhopal", duo("worker_c"), "worker_c", "raghav", ["No cuts to safety-critical roles. Head office won't love it.", "Cross-training and a night supervisor. A workable compromise.", "The full cut. That meets the target. Thank you.", "Hmm."]),
  S("f3", "bhopal", duo("worker_d"), "worker_d", "worker", ["Transfers stopped and the gauge fixed first. Thank you for telling us.", "Extra manual checks, gauge this week. We'll watch it closely.", "Minor, then. I hope it stays minor.", "Oh dear."]),
  S("f4", "bhopal", duo("nisha"), "nisha", "kavya", ["A joint drill and an alarm we can hear. Now the whole street will know.", "A drill inside, and a leaflet. It is something.", "Skipped, in case it alarms us? That is exactly why we worry.", "Hmm."]),
  S("f5", "bhopal", duo("worker_b"), "worker_b", "kavya", ["Emergency procedure started. Alerting the authority and sounding the alarm now.", "I'll take the team to check. Thirty minutes, then we escalate.", "An instrument fault. Understood. I'll wait for the day shift.", "Oh no."], { worker_b: "The night operator" }),
  S("f6", "bhopal", duo("nisha"), "nisha", "raghav", ["A full report, an independent review, published. That is what we hoped for.", "A report for us, the review kept private. Compliant, at least.", "Only what we already knew, and operator error. That is not the whole story.", "Hmm."], { nisha: "The regulator" }),
  // ------------------------------------------------------------------ COVID: a day at Riverside
  S("cw1", "covid", duo("kavya"), "kavya", "isha", ["You asked what worried me. The bed by the window: his breathing felt wrong.", "You have the two sickest. The others... I'll write it down.", "Fine. I'll go home. I hope the quiet ones stay quiet.", "Hmm."]),
  S("cw2", "covid", duo("isha"), "isha", "kavya", ["I present, I lead the plan, and you teach me why. Thank you.", "I'll watch you explain your reasoning. I'll learn from that.", "I'll just... watch, then.", "Hmm."]),
  S("cw3", "covid", duo("arjun"), "arjun", "kavya", ["Counted, minimums set, a standing order. Now we'll know when it's low.", "Supplies will send more next week. I'll let the store know.", "Not your job. Okay. I'll mention it to someone later.", "Hm."]),
  S("cw4", "covid", duo("nisha"), "nisha", "kavya", ["Thank you for sitting down and telling me. I'll wait for your update at four.", "A nurse will call? Please, I just want to know something.", "Results take as long as they take. I know. But he is my father.", "Oh dear."]),
  S("cw5", "covid", duo("worker_c"), "worker_c", "raghav", ["The occupancy data and a documented surge plan. I can defend that.", "A review in six months. It is a compromise, at least.", "Agreed, then. Ten beds gone. Not your department. Fine.", "Hmm."]),
  S("cw6", "covid", duo("kavya"), "kavya", "isha", ["Swap rules, a floating nurse, protected breaks. Thank you; I mean it.", "Thank you. I'm sure you'll look at the rota when you can.", "Everyone is stretched. Yes. I'll carry on.", "Hmm."]),
  S("cw7", "covid", duo("raghav"), "raghav", "kavya", ["Simple, fair rules, pinned up before anyone is tired. That is what I wanted.", "You leave it with me. I'll write it, but I'd rather we did it together.", "Unlikely to be needed. I hope you are right.", "Hmm."]),
  // ------------------------------------------------------------------ COVID: the surge at the hospital
  S("c1", "covid", [{ who: "director", x: 27 }, { who: "raghav", x: 47 }, { who: "kavya", x: 66, flip: true }], "raghav", "kavya", ["Agreed criteria and a triage lead on every shift. That is how it should work.", "Senior doctor, case by case. It works as long as I am not the bottleneck.", "In order of arrival. Simple. I just hope the sickest can wait.", "Hmm."]),
  S("c2", "covid", duo("worker_c"), "worker_c", "kavya", ["Step-down wing, clear criteria, transfers arranged. I'll open it.", "Staffed from the wards. It opens, but the wards will feel it.", "No new admissions. That stops the overload. Does it mean people are turned away?", "Hmm."]),
  S("c3", "covid", duo("kavya"), "kavya", "isha", ["A written plan, stock counted daily, nothing uncertified. We can work with that.", "Each ward decides. It is flexible. It won't be fair.", "We buy it all. The shelves will be full. I just hope it protects us.", "Oh no."]),
  S("c4", "covid", duo("worker_b"), "worker_b", "worker_c", ["An audit, monitoring and an emergency request to the district office. I'll push.", "Hurry up? I'll do what I can. Everyone is asking me the same.", "Limited to the least sick, and not told? I wouldn't want to be the one to say it.", "Hmm."]),
  S("c5", "covid", duo("isha"), "isha", "kavya", ["Criteria, a senior colleague, the reasons written down, and honest words to both families. Yes.", "You decide alone. All right. I'll support whatever you choose.", "First come, first served. That avoids choosing, doesn't it?", "Hmm."]),
  S("c6", "covid", duo("nisha"), "nisha", "kavya", ["A liaison, scheduled updates, a video call. Thank you for telling me plainly.", "Whenever a doctor can spare the time. So maybe tomorrow. Maybe not.", "The website, and no more calls? Please. Just tell me if he is alive.", "Oh dear."]),
  S("c7", "covid", duo("kavya"), "kavya", "isha", ["Rest rotation, extra staff, and peer support. I didn't think you would.", "A public thank-you and push through. We will. We always do.", "Absence will count against us. So we'll stop saying we are tired.", "Hmm."]),
  S("c8", "covid", duo("raghav"), "raghav", "kavya", ["A proper debrief, protocols updated, lessons shared. That is how we get better.", "A thank-you and back to normal. It is kind. It won't change anything.", "Move on and avoid the hard weeks. They will all be waiting next time.", "Hmm."]),
]);

/** Rooms where the usual places for the reaction scene (20, 50 and 80 percent across) would put someone on a counter, a bench or a toolbox. */
const SAFE: Record<string, Pick<WorkdayStep, "spots" | "fs" | "fl">> = {
  bw4: { spots: [46, 62, 80] }, h1: { spots: [20, 48, 70], fs: 0.6 }, h2: { fs: 0.74, fl: 2.6, spots: [10, 33, 66] }, h5: { fs: 0.72 }, h7: { fs: 0.76, fl: 2.4 }, h3: { spots: [14, 28, 42] }, c1: { spots: [20, 46, 68] }, c5: { spots: [20, 50, 74] },
  // rooms with a desk, console, valve or memorial in the middle distance: the people stand on the clear floor at the front, so nobody looks to be standing on something
  bw2: { fl: 2.6 }, h6: { fl: 2.6, spots: [12, 27, 91] }, f1: { fl: 2.6, spots: [10, 73, 92] }, f3: { fl: 2.6, spots: [12, 30, 84] }, f5: { fl: 2.6, spots: [12, 72, 91] },
};
export const WORKDAY: Record<string, WorkdayStep> = Object.fromEntries(Object.entries(BASE).map(([id, w]) => [id, { ...w, ...SAFE[id] }]));

export const isWorkdayStep = (id: string): boolean => id in WORKDAY;

/**
 * A generated simulation's step arrives with its own comic. It is set in one of the app's backdrops, so the places people stand (and the floor, size and safe spots
 * for that room) are taken from that backdrop's own step, and the step is added to the same tables the built-in steps use. Returns false if there is no comic or the backdrop is unknown.
 */
export function registerComic(step: Step): boolean {
  const c = step.comic;
  if (!c) return false;
  const base = WORKDAY[c.bg];
  if (!base) return false;
  const order = ["director", c.adv, c.third, ...c.cast.map((m) => m.who).filter((x) => x !== c.adv && x !== c.third)] as SpriteWho[];
  const cast = base.cast.slice(0, order.length).map((slot, i) => ({ ...slot, who: order[i] }));
  const people: Partial<Record<SpriteWho, Person>> = { director: { name: c.player, role: "You" } };
  for (const m of c.cast) people[m.who as SpriteWho] = { name: m.name, role: m.role };
  WORKDAY[step.id] = { sim: base.sim, bg: base.bg, cast, fl: base.fl, fs: base.fs, spots: base.spots, adv: c.adv as SpriteWho, third: c.third as SpriteWho, replies: c.replies, people };
  OPINIONS[step.id] = c.opinions as Record<string, never>;
  return true;
}

/** Who this sprite is in this step. */
export const peopleOf = (stepId: string): Partial<Record<SpriteWho, Person>> => { const w = WORKDAY[stepId]; return w ? (w.people ?? PEOPLE[w.sim]) : {}; };
export function personIn(stepId: string, who: SpriteWho): Person {
  const w = WORKDAY[stepId];
  const base = w ? peopleOf(stepId)[who] : undefined;
  return { name: w?.names?.[who] ?? base?.name ?? "Colleague", role: base?.role ?? "" };
}

const MOOD: Record<"strong" | "mixed" | "weak", Mood> = { strong: "support", mixed: "neutral", weak: "caution" };
const trim = (s: string) => s.replace(/[.\s]+$/, "");

/** The scene that plays when you commit to an option: you announce it, the colleague answers in their own voice, and (if it was a shaky call) someone else reacts. */
export function workdayReaction(stepId: string, choiceId: string, label: string): { reaction: Reaction; step: WorkdayStep } | null {
  const step = WORKDAY[stepId];
  if (!step) return null;
  const rating = (["strong", "mixed", "weak"] as const).find((r) => choiceId.endsWith(`_${r}`));
  if (!rating) return null;
  const mood = MOOD[rating];
  return { step, reaction: compose(mood, `Let's do it: ${trim(label)}.`, step.replies[rating], mood === "caution" ? step.replies.third : null) };
}

/** Poses for the people on a page: whoever speaks stands tall and talks, everyone else is calm. */
export const poseFor = (who: SpriteWho, speaker: SpriteWho | null, mood: SpritePose = "calm"): SpritePose => (who === speaker ? "speaking" : mood);
