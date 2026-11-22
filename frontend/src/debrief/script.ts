import type { SimReport } from "../api/sims";
import type { CharacterId } from "../comic/types";
import type { Report, ReportDecision } from "../api/types";
import { characterInfo } from "../comic/assets";

/**
 * The Archivist's debrief. Every sentence is built from the finished run's own report (what was chosen, what it did, what a stronger
 * option was). Nothing is invented here; the character only gives the facts a voice.
 */
export type Mood = "calm" | "warm" | "pointed" | "grave";
export type Tone = "good" | "mid" | "bad" | "plain";
export interface Card { kicker: string; heading: string; chips: { text: string; tone: Tone }[]; rows: { label: string; value: string; tone: Tone }[]; better?: string }
export interface Scene { id: string; chapter: string; mood: Mood; lines: string[]; card?: Card }

export const clip = (t: string, max = 240): string => {
  const s = t.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return (end > 80 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(" ")) + "…").trim();
};
export const dot = (t: string): string => (/[.!?…”"]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
export const lowerFirst = (t: string): string => t.charAt(0).toLowerCase() + t.slice(1);
export const nameOf = (id: string): string => { try { return characterInfo(id as CharacterId).name; } catch { return id; } };

/** What the voice actually says: symbols and shorthand a speech engine would stumble over are written the way a person would say them. */
export function spoken(text: string): string {
  return text.replace(/[“”"]/g, "")
    .replace(/\b0(\d):(\d\d)\b/g, "$1:$2")                                          // 07:30 is "seven thirty", not "zero seven"
    .replace(/(\d)\s*[-–—]\s*(?=\d)/g, "$1 to ")                                       // 2-3 and 2–3 are "2 to 3", never "2 dash 3"
    .replace(/(\d+)\s*\/\s*(\d+)/g, "$1 out of $2")
    .replace(/(\d+)\.0\b/g, "$1")
    .replace(/₹\s?([\d.,]+)(\s*(?:lakh|crore))?/g, (_m, n: string, u?: string) => `${n}${u ?? ""} rupees`)
    .replace(/\s*(?:→|->)\s*/g, " to ").replace(/×/g, " times ").replace(/~/g, "about ").replace(/−/g, "minus ").replace(/\+(?=\d)/g, "plus ").replace(/%/g, " percent").replace(/&/g, " and ")
    .replace(/\be\.g\./gi, "for example").replace(/\bi\.e\./gi, "that is").replace(/\bvs\.?(?=\s)/gi, "versus").replace(/\betc\./gi, "and so on")
    .replace(/\s*[()]\s*/g, ", ").replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",").replace(/,\s*([.!?])/g, "$1").replace(/\s+/g, " ").trim();
}

/** A different seed each time a debrief is opened, so the Archivist does not say the same words every time. */
export function newSeed(): number {
  try { const n = (Number(localStorage.getItem("rl.debrief.n")) || 0) + 1; localStorage.setItem("rl.debrief.n", String(n)); return n * 7919 + Math.floor(Math.random() * 1000); } catch { return Math.floor(Math.random() * 1e6); }
}
/** Picks one of several ways to say the same thing. Within one debrief a phrase is not repeated while there is an unused way to say it. */
export function voice(seed: number) {
  let a = seed >>> 0 || 1;
  const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const used = new Map<string, Set<number>>();
  return <T,>(key: string, options: T[]): T => {
    const seen = used.get(key) ?? new Set<number>(); used.set(key, seen);
    if (seen.size >= options.length) seen.clear();
    let i = Math.floor(rnd() * options.length);
    while (seen.has(i)) i = (i + 1) % options.length;
    seen.add(i);
    return options[i];
  };
}

// -------------------------------------------------------------------------- the three professions (generic engine)
export function scriptForSim(r: SimReport, seed: number = newSeed()): Scene[] {
  const say = voice(seed);
  const out: Scene[] = [];
  const sum = r.summary;
  const good = r.outcome.tone === "good", bad = r.outcome.tone === "bad";
  const greeting = good ? [
    "Welcome back. Pull up a chair. I've been looking forward to this one, because there's a lot in your record worth talking about.",
    "Ah, there you are. Come in and sit down. I've read through everything you did, and I think you'll be pleased with parts of it.",
    "Good to see you. Make yourself comfortable. Your record is open in front of me, and honestly, it makes for a good read.",
  ] : bad ? [
    "Come in, and sit down. This one was hard, and I'm not going to pretend otherwise. But there's a great deal we can learn from it, so let's go through it together.",
    "Hello. Take a seat. I've read your record from start to finish, and I want to talk it through with you, calmly, one choice at a time.",
    "There you are. Sit down, take a breath. Some of this will be difficult to hear, but that's exactly why it's worth hearing.",
  ] : [
    "Come in, sit down. I keep the record of every choice, and yours is open in front of me. Let's talk about how it went.",
    "Hello again. Settle in. I've been through everything you decided, and I'd like to walk you through it, not just read it at you.",
    "Right, you're here. Make yourself comfortable. There's a story in your choices, and I'd like to tell it with you.",
    "Welcome. Take a seat. I've gone over each decision you made, and I have thoughts on all of them.",
  ];
  out.push({
    id: "open", chapter: "Your ledger", mood: good ? "warm" : bad ? "grave" : "calm",
    lines: [
      say("greet", greeting),
      say("role", [`This time you were the ${r.role}, and you ended up at a place called ${r.outcome.title}.`, `You stepped into the role of ${r.role}. Where you landed was ${r.outcome.title}.`, `You played the ${r.role}, and your story finished at ${r.outcome.title}.`]),
      dot(clip(r.outcome.text, 260)),
      say("count", [
        `In all, you made ${plural(sum.decisions, "decision")}: ${sum.strong} strong, ${sum.mixed} mixed, and ${sum.weak} weak. Let's take them in turn.`,
        `That came to ${plural(sum.decisions, "decision")}. ${sum.strong} of them were strong, ${sum.mixed} were mixed, and ${sum.weak} were weak. Shall we go through them?`,
        `Looking at your ${plural(sum.decisions, "decision")}, ${sum.strong} were strong, ${sum.mixed} mixed, and ${sum.weak} weak. I'll walk you through the ones that matter.`,
      ]),
    ],
    card: { kicker: "The ending", heading: r.outcome.title, chips: [
      { text: `${sum.strong} strong`, tone: "good" }, { text: `${sum.mixed} mixed`, tone: "mid" }, { text: `${sum.weak} weak`, tone: "bad" }],
      rows: r.final_meters.filter((m) => m.label !== "Understanding of the record").map((m) => ({ label: m.label, value: String(m.value), tone: ((m.good === "high" ? m.value : 100 - m.value) >= 65 ? "good" : (m.good === "high" ? m.value : 100 - m.value) >= 40 ? "mid" : "bad") as Tone })) },
  });

  const row = (d: SimReport["major_decisions"][number]) => d.effects?.length
    ? d.effects.map((e) => ({ label: e.label, value: `${e.from} → ${e.to}`, tone: ((e.to - e.from) * (e.good === "high" ? 1 : -1) >= 0 ? "good" : "bad") as Tone }))
    : [];
  const effectLine = (d: SimReport["major_decisions"][number]): string => {
    const top = [...(d.effects ?? [])].sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from)).slice(0, 2);
    if (!top.length) return "";
    const what = top.map((e) => `${e.label.toLowerCase()} from ${e.from} to ${e.to}`).join(", and ");
    return say("effect", [`In numbers, it moved ${what}.`, `You can see it in the figures: ${what}.`, `It moved ${what}.`]);
  };

  // a decision is done well if it was strong, or if it was the best on offer in a dilemma (a round with no perfect option)
  const hard = (d: SimReport["major_decisions"][number]): boolean => d.rating === "mixed" && !d.stronger_option;
  const strong = r.major_decisions.filter((d) => d.rating === "strong" || hard(d)).slice(0, 2);
  strong.forEach((d, i) => out.push({
    id: `good-${i}`, chapter: hard(d) ? "A hard call" : "Done well", mood: "warm",
    lines: [
      hard(d)
        ? say("hard", [`Here's a hard one, with no perfect answer. At ${d.step}, you chose ${d.chose}. Given what was on the table, it was the best of the options.`, `Now this was a genuine dilemma. At ${d.step}, nothing was clean, and you chose ${d.chose}. I'd say that was the best of what you had.`])
        : say("well", [`Let's start with something you got right. At ${d.step}, you chose ${d.chose}.`, `Here's one I liked. When it came to ${d.step}, you went with ${d.chose}.`, `This next one went well. At ${d.step}, you decided on ${d.chose}.`, `Let me show you a choice that worked. ${d.step}: you chose ${d.chose}.`]),
      `${say("followed", ["Here's what followed.", "This is how it played out.", "And the result was this."])} ${dot(clip(d.consequence, 300))}`,
      effectLine(d),
      !hard(d) && d.lesson ? `${say("lesson", ["The thing to keep from that is this.", "Remember this part.", "What I'd take from it is this."])} ${dot(clip(d.lesson, 200))}` : "",
    ].filter(Boolean),
    card: { kicker: d.part, heading: d.step, chips: [{ text: hard(d) ? "Best available" : "Strong", tone: "good" }], rows: row(d) },
  }));

  const improveBy = new Map(r.improve.map((m) => [m.step, m]));
  const faults = [...r.major_decisions.filter((d) => d.rating === "weak"), ...r.major_decisions.filter((d) => d.rating === "mixed" && !hard(d))].slice(0, 5);
  if (!faults.length) {
    out.push({ id: "clean", chapter: "No mistakes", mood: "warm", lines: [say("clean", ["I went looking for the mistakes, and I couldn't find a single one.", "I checked twice for something to criticise. There was nothing."]), "Every decision was rated strong. If you play again and choose differently, you'll see how the other paths would have unfolded."] });
  } else {
    out.push({ id: "turn", chapter: "Where it slipped", mood: "grave", lines: [
      faults.length === 1
        ? say("turn1", ["Now, there's one decision I'd ask you to look at again.", "Right. There's one choice I'd like us to slow down on.", "Let's talk about the one that slipped."])
        : say("turnN", [`Now, there are ${faults.length} decisions I'd ask you to look at again.`, `Right. ${faults.length} of your choices deserve a second look.`, `Let's slow down on the ${faults.length} that slipped.`]),
      say("notVerdict", ["None of this is a verdict on you. It's simply what the record shows.", "Please don't take this personally. It's only what the record shows.", "This isn't about blame. It's how people get better at hard things."]),
    ] });
    faults.forEach((d, i) => {
      const im = improveBy.get(d.step);
      const better = d.stronger_option ?? im?.stronger_option ?? null;
      out.push({
        id: `fault-${i}`, chapter: d.step, mood: d.rating === "weak" ? "grave" : "pointed",
        lines: [
          say("faultIntro", [`${d.step}. You chose ${d.chose}, and I rated that ${d.rating}.`, `Let's look at ${d.step}. You went with ${d.chose}. I'd call that ${d.rating}.`, `Take ${d.step}. Here you chose ${d.chose}, which I marked ${d.rating}.`, `Then there was ${d.step}. You chose ${d.chose}, and I have to rate it ${d.rating}.`]),
          `${say("happened", ["Here's what happened.", "This is where it led.", "And this is what followed."])} ${dot(clip(d.consequence))}`,
          effectLine(d),
          (d.lesson || im?.why) ? dot(clip(d.lesson || im!.why, 220)) : "",
          better ? say("better", [`A stronger option was: ${better}. Next time, weigh that one first.`, `What I'd have tried instead is this: ${better}. Keep it in mind next time.`, `If you could go back, consider this: ${better}.`]) : "",
        ].filter(Boolean),
        card: { kicker: d.part, heading: d.step, chips: [{ text: d.rating === "weak" ? "Weak" : "Mixed", tone: d.rating === "weak" ? "bad" : "mid" }, { text: `You chose: ${d.chose}`, tone: "plain" }], rows: row(d), better: better ?? undefined },
      });
    });
  }

  if (r.kind === "workday" && r.prep?.length) {
    const missed = r.prep.filter((p) => p.status === "missed"), set = r.prep.filter((p) => p.status === "full");
    out.push({
      id: "prep", chapter: "Setting up the crisis", mood: missed.length ? "pointed" : "warm",
      lines: [
        `${say("prep", ["An ordinary day isn't only an ordinary day. It shapes the crisis that follows.", "Here's something worth knowing: this quiet day also set the stage for the crisis.", "This normal day was doing more work than it seemed. It prepared you for what comes next."])} You fully set up ${plural(set.length, "thing")}${set.length ? `, including ${set.slice(0, 2).map((p) => p.label.toLowerCase()).join(" and ")}` : ""}.`,
        missed.length ? `${say("missed", ["You did not set up", "You left out", "You didn't get around to"])} ${missed.slice(0, 3).map((p) => p.label.toLowerCase()).join(", ")}. When the crisis comes, you'll feel the gap.` : "Nothing was left undone, so you'll start the crisis with every advantage this day could give you.",
      ],
      card: { kicker: "Preparation", heading: "What the day set up", chips: [], rows: r.prep.map((p) => ({ label: p.label, value: p.status === "full" ? "Set up" : p.status === "part" ? "Half" : "Not set up", tone: (p.status === "full" ? "good" : p.status === "part" ? "mid" : "bad") as Tone })) },
    });
  } else if (r.kind === "crisis") {
    const prepared = r.prepared ?? [];
    out.push({
      id: "prep", chapter: "Your head start", mood: prepared.length ? "warm" : "pointed",
      lines: [prepared.length
        ? say("head", [`You walked into this crisis with a head start from your ordinary day: ${prepared.slice(0, 3).map((p) => p.label.toLowerCase()).join(", ")}. That preparation counted.`, `Your ordinary day paid off here. You went in already prepared: ${prepared.slice(0, 3).map((p) => p.label.toLowerCase()).join(", ")}.`])
        : say("nohead", ["You walked into this crisis with no head start. Playing the ordinary day first changes how a crisis begins, and it's worth trying.", "No head start this time. If you play the ordinary day first, the crisis opens very differently."])],
    });
  }

  const weak = [...r.skills].sort((a, b) => a.percent - b.percent).slice(0, 2).filter((s) => s.percent < 100);
  const best = [...r.skills].sort((a, b) => b.percent - a.percent)[0];
  if (r.skills.length) {
    out.push({
      id: "skills", chapter: "Your skills", mood: "calm",
      lines: [
        best ? say("best", [`Your strongest skill here was ${best.label.toLowerCase()}, at ${best.percent} percent.`, `If I had to pick what you did best, it was ${best.label.toLowerCase()}, at ${best.percent} percent.`, `${best.label} was your high point, at ${best.percent} percent.`]) : "",
        ...weak.map((s) => `${say("weak", [`${s.label} sits at ${s.percent} percent, which I'd call ${s.level.toLowerCase()}.`, `${s.label} came out at ${s.percent} percent. I'd call that ${s.level.toLowerCase()}.`, `On ${s.label.toLowerCase()}, you reached ${s.percent} percent, which is ${s.level.toLowerCase()}.`])} ${s.explanation}`),
      ].filter(Boolean).map((l) => dot(clip(l, 300))),
      card: { kicker: "Skills", heading: "What your decisions showed", chips: [], rows: r.skills.map((s) => ({ label: s.label, value: `${s.percent}%`, tone: (s.percent >= 75 ? "good" : s.percent >= 50 ? "mid" : "bad") as Tone })) },
    });
  }

  const next = r.recommended_next;
  out.push({
    id: "close", chapter: "Carry this forward", mood: "warm",
    lines: [
      ...r.lessons.slice(0, 2).map((l, i) => `${i === 0 ? say("l1", ["If you remember one thing, make it this.", "Carry this with you.", "Here's what I'd like you to take away."]) : say("l2", ["And one more thing.", "And this as well.", "Also, keep this in mind."])} ${dot(clip(l, 220))}`),
      next.reason ? dot(clip(next.reason, 220)) : "",
      say("sign", [
        "Remember, this describes your choices in this simulation only. It isn't a judgement of who you are, or of any profession's fit for you. Go well.",
        "One last thing. This is only about the choices you made here. It says nothing about who you are, or what you should become. Take care, and come back whenever you like.",
        "That's all from me. It's a picture of your choices in this one simulation, not a verdict on you or on any career. Until next time.",
      ]),
    ].filter(Boolean),
  });
  return out;
}

// -------------------------------------------------------------------------- BLACKOUT (the scored report)
export const sign = (n: number): string => `${n > 0 ? "plus" : n < 0 ? "minus" : ""} ${Math.abs(Math.round(n * 10) / 10)}`.trim();

export function scriptForBlackout(r: Report, seed: number = newSeed()): Scene[] {
  const say = voice(seed);
  const out: Scene[] = [];
  const q = r.quality;
  const d = (i: number): ReportDecision | undefined => r.decisions[i];
  const score = r.overall.score;
  out.push({
    id: "open", chapter: "Your ledger", mood: score >= 75 ? "warm" : score >= 50 ? "calm" : "grave",
    lines: [
      say("greet", score >= 75 ? [
        "Come in, sit down. That was a strong showing, and I'd like to go through it with you.",
        "Welcome back. Take a seat. You handled the attack better than most, and I want to show you why.",
      ] : score >= 50 ? [
        "Come in, sit down. Every choice you made during the attack is written here, and now we can talk through them.",
        "Hello again. Settle in. I've read back through the whole attack, and there's plenty worth discussing.",
        "Right, you're here. Make yourself comfortable. Let's go back through those hours together.",
      ] : [
        "Come in, and sit down. That was a brutal attack, and the record shows it. But there's a lot to learn here, so let's go through it calmly.",
        "Hello. Take a seat. It didn't go the way you wanted, but nothing here is wasted. Let's look at it together.",
      ]),
      `${say("ending", ["The record calls your ending", "Your story finished as", "You reached the ending called"])} ${r.ending.title}. ${r.ending.text ? dot(clip(r.ending.text, 220)) : ""}`,
      `${say("score", [`Your readiness score was ${Math.round(score)} out of one hundred, which I'd call ${r.overall.band.toLowerCase()}.`, `I scored your readiness at ${Math.round(score)} out of one hundred. That's ${r.overall.band.toLowerCase()}.`, `On readiness, you reached ${Math.round(score)} out of one hundred, a ${r.overall.band.toLowerCase()} result.`])}${r.overall.cap ? ` ${dot(r.overall.cap)}` : ""}`,
      `${say("quality", [`Of your ${plural(r.decision_count, "decision")}, ${q.sound} were sound, ${q.questionable} questionable, and ${q.poor} poor.`, `You made ${plural(r.decision_count, "decision")} in total. ${q.sound} were sound, ${q.questionable} were questionable, and ${q.poor} were poor.`])}${q.unlucky ? ` ${plural(q.unlucky, "was", "were")} undone by bad luck rather than bad judgement.` : ""}`,
    ].filter(Boolean),
    card: { kicker: "The ending", heading: r.ending.title, chips: [{ text: `Score ${Math.round(score)}`, tone: score >= 75 ? "good" : score >= 50 ? "mid" : "bad" }, { text: r.overall.band, tone: "plain" }],
      rows: r.categories.map((c) => ({ label: c.name, value: String(Math.round(c.score)), tone: (c.score >= 75 ? "good" : c.score >= 50 ? "mid" : "bad") as Tone })) },
  });

  r.strongest_decisions.slice(0, 2).map(d).forEach((x, i) => x && out.push({
    id: `good-${i}`, chapter: "Done well", mood: "warm",
    lines: [
      say("well", [`Let's start with something you got right. Decision ${x.index + 1}, ${x.clock}. You chose ${x.label}.`, `Here's one I liked. At decision ${x.index + 1}, ${x.clock}, you went with ${x.label}.`, `This one went well. Decision ${x.index + 1}, ${x.clock}: ${x.label}.`]),
      dot(clip(x.verdict, 260)),
      say("raised", [`It raised your readiness by ${Math.abs(Math.round(x.impact.score_delta * 10) / 10)} points.`, `That alone was worth ${Math.abs(Math.round(x.impact.score_delta * 10) / 10)} points of readiness.`]),
    ],
    card: { kicker: `Decision ${x.index + 1} · ${x.clock}`, heading: x.label, chips: [{ text: "Sound", tone: "good" }, { text: `Impact ${sign(x.impact.score_delta)}`, tone: "good" }], rows: [] },
  }));

  const mistakes = r.most_damaging_decisions.map(d).filter((x): x is ReportDecision => !!x).slice(0, 4);
  if (!mistakes.length) {
    out.push({ id: "clean", chapter: "No mistakes", mood: "warm", lines: [say("clean", ["I looked for the mistakes. I couldn't find a single decision that cost you.", "I went searching for a costly decision, and came up empty. Well done."])] });
  } else {
    out.push({ id: "turn", chapter: "Where it slipped", mood: "grave", lines: [
      mistakes.length === 1 ? say("turn1", ["Now, the decision that cost you most.", "Right. There's one choice I want us to look at closely."]) : say("turnN", [`Now, the ${mistakes.length} decisions that cost you most.`, `Right. ${mistakes.length} of your choices cost you the most, so let's look at them.`]),
      say("know", ["I'll tell you what you knew at the time, and what you could have done instead.", "I'll be fair: what did you know then, and what was open to you?"]),
    ] });
    mistakes.forEach((x, i) => {
      const warn = x.warned_by[0];
      out.push({
        id: `fault-${i}`, chapter: `Decision ${x.index + 1}`, mood: x.rating === "poor" ? "grave" : "pointed",
        lines: [
          say("faultIntro", [`Decision ${x.index + 1}, ${x.clock}. You chose ${x.label}, and I rated that ${x.rating}.`, `Look at decision ${x.index + 1}, ${x.clock}. You went with ${x.label}. I'd call that ${x.rating}.`, `Then, at ${x.clock}, decision ${x.index + 1}: ${x.label}. I have to rate that ${x.rating}.`]),
          dot(clip(x.verdict, 260)),
          warn ? `${say("warned", [`${nameOf(warn.stakeholder)} had warned you.`, `And you weren't without warning. ${nameOf(warn.stakeholder)} had spoken up.`])} ${dot(clip(warn.why, 200))}` : "",
          x.outcome === "unlucky" ? `${say("luck", ["To be fair, luck was against you here.", "In fairness, some of this was just bad luck."])} ${x.bad_luck[0] ? dot(clip(x.bad_luck[0], 180)) : ""}` : "",
          say("cost", [`It cost your readiness ${Math.abs(Math.round(x.impact.score_delta * 10) / 10)} points.`, `That decision took ${Math.abs(Math.round(x.impact.score_delta * 10) / 10)} points off your readiness.`]),
          x.alternative ? `${say("alt", ["What you could have done:", "The better road was this:", "Here's what I'd have tried:"])} ${x.alternative.label}.${x.alternative.differences[0] ? ` ${dot(clip(x.alternative.differences[0], 200))}` : ""}` : "",
        ].filter(Boolean),
        card: { kicker: `Decision ${x.index + 1} · ${x.clock}`, heading: x.label, chips: [{ text: x.rating === "poor" ? "Poor" : "Questionable", tone: x.rating === "poor" ? "bad" : "mid" }, { text: `Impact ${sign(x.impact.score_delta)}`, tone: "bad" }, ...(warn ? [{ text: `Warned by ${nameOf(warn.stakeholder)}`, tone: "mid" as Tone }] : [])], rows: [], better: x.alternative?.label },
      });
    });
  }

  const losses = r.avoidable_losses.slice(0, 2);
  if (losses.length) out.push({
    id: "losses", chapter: "What it cost", mood: "grave",
    lines: [say("lossIntro", ["Some of what you lost could have been avoided.", "Here's the part that stings: not all of those losses were necessary."]), ...losses.map((l) => dot(`You lost ${l.amount} ${l.unit} at ${lowerFirst(l.event)}, ${l.clock}.${l.caused_by ? ` I trace that to decision ${l.caused_by.index + 1}, ${l.caused_by.label}.` : ""}${l.alternative ? ` Choosing ${l.alternative} would have avoided it.` : ""}`))],
    card: { kicker: "Avoidable losses", heading: "What could have been saved", chips: [], rows: losses.map((l) => ({ label: l.event, value: `−${l.amount}`, tone: "bad" as Tone })) },
  });

  if (r.reveal.records_overstated_by > 0) out.push({
    id: "reveal", chapter: "What you could not know", mood: "grave",
    lines: [say("reveal", ["Now I can tell you something you were never shown while you played.", "And here's what no one could tell you in the moment."]), `Your records claimed ${r.reveal.recorded_units} lots of cargo. In truth there were ${r.reveal.true_units}. The records were overstated by ${r.reveal.records_overstated_by}, and only ${r.reveal.verified_units} had been verified.`, say("check", ["Checking before you trust a record is the oldest lesson there is.", "It's why you verify before you rely on a record."])],
    card: { kicker: "The reveal", heading: "The records were wrong", chips: [], rows: [{ label: "Recorded", value: String(r.reveal.recorded_units), tone: "plain" }, { label: "Truly there", value: String(r.reveal.true_units), tone: "plain" }, { label: "Verified", value: String(r.reveal.verified_units), tone: "good" }] },
  });

  const focus = r.focus_next.slice(0, 2);
  if (focus.length) out.push({
    id: "focus", chapter: "What to improve", mood: "pointed",
    lines: [say("focus", ["If you play this again, here's where I'd put your attention.", "So, where to focus next time? Here's what I'd suggest."]), ...focus.map((f) => dot(`${f.category}, which scored ${Math.round(f.score)}. ${clip(f.advice, 220)}`))],
    card: { kicker: "Focus next", heading: "Where to improve", chips: [], rows: focus.map((f) => ({ label: f.category, value: String(Math.round(f.score)), tone: (f.score >= 50 ? "mid" : "bad") as Tone })) },
  });

  out.push({ id: "close", chapter: "Carry this forward", mood: "warm", lines: [
    say("calc", ["Every number I read to you was calculated from what you did. No machine guessed at it.", "None of these figures were guessed. Each one comes straight from your choices."]),
    say("sign", ["The written report holds every detail, and you can rewind to any decision and choose again. Go well.", "If you want the detail, the written report has all of it, and you can go back to any decision and try again. Take care.", "You can rewind to any decision and choose again. Whenever you're ready. Until next time."]),
  ] });
  return out;
}
