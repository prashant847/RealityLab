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

const clip = (t: string, max = 240): string => {
  const s = t.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return (end > 80 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(" ")) + "…").trim();
};
const dot = (t: string): string => (/[.!?…”"]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
const lowerFirst = (t: string): string => t.charAt(0).toLowerCase() + t.slice(1);
const nameOf = (id: string): string => { try { return characterInfo(id as CharacterId).name; } catch { return id; } };

/** What the voice actually says: symbols a speech engine would stumble over are written out. */
export function spoken(text: string): string {
  return text.replace(/[“”"]/g, "").replace(/−/g, "minus ").replace(/\+(?=\d)/g, "plus ").replace(/%/g, " percent").replace(/&/g, " and ").replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+/g, " ").trim();
}

const OPENERS = ["Let us begin with what you did well.", "Here is one that went well."];

// -------------------------------------------------------------------------- the three professions (generic engine)
export function scriptForSim(r: SimReport): Scene[] {
  const out: Scene[] = [];
  const sum = r.summary;
  out.push({
    id: "open", chapter: "Your ledger", mood: r.outcome.tone === "good" ? "warm" : r.outcome.tone === "bad" ? "grave" : "calm",
    lines: [
      "Come in. Sit down. I keep the record of every choice, and yours is open in front of me.",
      `You spent this time in the role of ${r.role}. The ending you reached was called ${r.outcome.title}.`,
      dot(clip(r.outcome.text, 260)),
      `You made ${plural(sum.decisions, "decision")}. ${sum.strong} strong, ${sum.mixed} mixed, and ${sum.weak} weak. Let me take you through them.`,
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
    return `It moved ${top.map((e) => `${e.label.toLowerCase()} from ${e.from} to ${e.to}`).join(", and ")}.`;
  };

  const strong = r.major_decisions.filter((d) => d.rating === "strong").slice(0, 2);
  strong.forEach((d, i) => out.push({
    id: `good-${i}`, chapter: "Done well", mood: "warm",
    lines: [`${OPENERS[i % OPENERS.length]} At ${d.step}, you chose ${d.chose}.`, dot(clip(d.consequence)), effectLine(d), d.lesson ? dot(clip(d.lesson, 200)) : ""].filter(Boolean),
    card: { kicker: d.part, heading: d.step, chips: [{ text: "Strong", tone: "good" }], rows: row(d) },
  }));

  const improveBy = new Map(r.improve.map((m) => [m.step, m]));
  const faults = [...r.major_decisions.filter((d) => d.rating === "weak"), ...r.major_decisions.filter((d) => d.rating === "mixed")].slice(0, 5);
  if (!faults.length) {
    out.push({ id: "clean", chapter: "No mistakes", mood: "warm", lines: ["I looked for the mistakes. I could not find one.", "Every decision was rated strong. If you play again with different choices, you will see how the alternatives would have unfolded."] });
  } else {
    out.push({ id: "turn", chapter: "Where it slipped", mood: "grave", lines: [faults.length === 1 ? "Now, the one decision I would ask you to look at again." : `Now, the ${faults.length} decisions I would ask you to look at again.`, "None of this is a verdict on you. It is simply what the record shows."] });
    faults.forEach((d, i) => {
      const im = improveBy.get(d.step);
      const better = d.stronger_option ?? im?.stronger_option ?? null;
      out.push({
        id: `fault-${i}`, chapter: d.step, mood: d.rating === "weak" ? "grave" : "pointed",
        lines: [
          `${d.step}. You chose ${d.chose}. I rated that ${d.rating}.`,
          dot(clip(d.consequence)),
          effectLine(d),
          (d.lesson || im?.why) ? dot(clip(d.lesson || im!.why, 220)) : "",
          better ? `A stronger option was: ${better}. Next time, weigh that one first.` : "",
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
        `This ordinary day also shaped the crisis that follows. You fully set up ${plural(set.length, "thing")}${set.length ? `, including ${set.slice(0, 2).map((p) => p.label.toLowerCase()).join(" and ")}` : ""}.`,
        missed.length ? `You did not set up ${missed.slice(0, 3).map((p) => p.label.toLowerCase()).join(", ")}. When the crisis comes, you will feel the gap.` : "Nothing was left undone. You will start the crisis with every advantage this day could give you.",
      ],
      card: { kicker: "Preparation", heading: "What the day set up", chips: [], rows: r.prep.map((p) => ({ label: p.label, value: p.status === "full" ? "Set up" : p.status === "part" ? "Half" : "Not set up", tone: (p.status === "full" ? "good" : p.status === "part" ? "mid" : "bad") as Tone })) },
    });
  } else if (r.kind === "crisis") {
    const prepared = r.prepared ?? [];
    out.push({
      id: "prep", chapter: "Your head start", mood: prepared.length ? "warm" : "pointed",
      lines: [prepared.length
        ? `You walked into this crisis with a head start from your ordinary day: ${prepared.slice(0, 3).map((p) => p.label.toLowerCase()).join(", ")}. That preparation counted.`
        : "You walked into this crisis with no head start. Doing the ordinary day first changes how a crisis begins. It is worth trying."],
    });
  }

  const weak = [...r.skills].sort((a, b) => a.percent - b.percent).slice(0, 2).filter((s) => s.percent < 100);
  const best = [...r.skills].sort((a, b) => b.percent - a.percent)[0];
  if (r.skills.length) {
    out.push({
      id: "skills", chapter: "Your skills", mood: "calm",
      lines: [
        best ? `Your strongest skill here was ${best.label.toLowerCase()}, at ${best.percent} percent.` : "",
        ...weak.map((s) => `${s.label} sits at ${s.percent} percent, which I would call ${s.level.toLowerCase()}. ${s.explanation}`),
      ].filter(Boolean).map((l) => dot(clip(l, 300))),
      card: { kicker: "Skills", heading: "What your decisions showed", chips: [], rows: r.skills.map((s) => ({ label: s.label, value: `${s.percent}%`, tone: (s.percent >= 75 ? "good" : s.percent >= 50 ? "mid" : "bad") as Tone })) },
    });
  }

  const next = r.recommended_next;
  out.push({
    id: "close", chapter: "Carry this forward", mood: "warm",
    lines: [
      ...r.lessons.slice(0, 2).map((l, i) => `${i === 0 ? "Carry this with you:" : "And this:"} ${dot(clip(l, 220))}`),
      next.reason ? dot(clip(next.reason, 220)) : "",
      "This describes your choices in this simulation only. It is not a judgement of who you are, or of any profession's fit for you. Go well.",
    ].filter(Boolean),
  });
  return out;
}

// -------------------------------------------------------------------------- BLACKOUT (the scored report)
const sign = (n: number): string => `${n > 0 ? "plus" : n < 0 ? "minus" : ""} ${Math.abs(Math.round(n * 10) / 10)}`.trim();

export function scriptForBlackout(r: Report): Scene[] {
  const out: Scene[] = [];
  const q = r.quality;
  const d = (i: number): ReportDecision | undefined => r.decisions[i];
  out.push({
    id: "open", chapter: "Your ledger", mood: r.overall.score >= 75 ? "warm" : r.overall.score >= 50 ? "calm" : "grave",
    lines: [
      "Come in. Sit down. Every choice you made during the attack is written here, and now I can read it back to you.",
      `The record calls your ending ${r.ending.title}. ${r.ending.text ? dot(clip(r.ending.text, 220)) : ""}`,
      `Your readiness score was ${Math.round(r.overall.score)} out of one hundred, which I would call ${r.overall.band.toLowerCase()}.${r.overall.cap ? ` ${dot(r.overall.cap)}` : ""}`,
      `Of your ${plural(r.decision_count, "decision")}, ${q.sound} were sound, ${q.questionable} questionable, and ${q.poor} poor.${q.unlucky ? ` ${plural(q.unlucky, "was", "were")} undone by bad luck rather than bad judgement.` : ""}`,
    ].filter(Boolean),
    card: { kicker: "The ending", heading: r.ending.title, chips: [{ text: `Score ${Math.round(r.overall.score)}`, tone: r.overall.score >= 75 ? "good" : r.overall.score >= 50 ? "mid" : "bad" }, { text: r.overall.band, tone: "plain" }],
      rows: r.categories.map((c) => ({ label: c.name, value: String(Math.round(c.score)), tone: (c.score >= 75 ? "good" : c.score >= 50 ? "mid" : "bad") as Tone })) },
  });

  r.strongest_decisions.slice(0, 2).map(d).forEach((x, i) => x && out.push({
    id: `good-${i}`, chapter: "Done well", mood: "warm",
    lines: [`${OPENERS[i % OPENERS.length]} Decision ${x.index + 1}, ${x.clock}. You chose ${x.label}.`, dot(clip(x.verdict, 260)), `It raised your readiness by ${Math.abs(Math.round(x.impact.score_delta * 10) / 10)} points.`],
    card: { kicker: `Decision ${x.index + 1} · ${x.clock}`, heading: x.label, chips: [{ text: "Sound", tone: "good" }, { text: `Impact ${sign(x.impact.score_delta)}`, tone: "good" }], rows: [] },
  }));

  const mistakes = r.most_damaging_decisions.map(d).filter((x): x is ReportDecision => !!x).slice(0, 4);
  if (!mistakes.length) {
    out.push({ id: "clean", chapter: "No mistakes", mood: "warm", lines: ["I looked for the mistakes. I could not find a single decision that cost you."] });
  } else {
    out.push({ id: "turn", chapter: "Where it slipped", mood: "grave", lines: [mistakes.length === 1 ? "Now, the decision that cost you most." : `Now, the ${mistakes.length} decisions that cost you most.`, "I will tell you what you knew at the time, and what you could have done instead."] });
    mistakes.forEach((x, i) => {
      const warn = x.warned_by[0];
      out.push({
        id: `fault-${i}`, chapter: `Decision ${x.index + 1}`, mood: x.rating === "poor" ? "grave" : "pointed",
        lines: [
          `Decision ${x.index + 1}, ${x.clock}. You chose ${x.label}. I rated that ${x.rating}.`,
          dot(clip(x.verdict, 260)),
          warn ? `${nameOf(warn.stakeholder)} had warned you. ${dot(clip(warn.why, 200))}` : "",
          x.outcome === "unlucky" ? `To be fair, luck was against you here. ${x.bad_luck[0] ? dot(clip(x.bad_luck[0], 180)) : ""}` : "",
          `It cost your readiness ${Math.abs(Math.round(x.impact.score_delta * 10) / 10)} points.`,
          x.alternative ? `What you could have done: ${x.alternative.label}.${x.alternative.differences[0] ? ` ${dot(clip(x.alternative.differences[0], 200))}` : ""}` : "",
        ].filter(Boolean),
        card: { kicker: `Decision ${x.index + 1} · ${x.clock}`, heading: x.label, chips: [{ text: x.rating === "poor" ? "Poor" : "Questionable", tone: x.rating === "poor" ? "bad" : "mid" }, { text: `Impact ${sign(x.impact.score_delta)}`, tone: "bad" }, ...(warn ? [{ text: `Warned by ${nameOf(warn.stakeholder)}`, tone: "mid" as Tone }] : [])], rows: [], better: x.alternative?.label },
      });
    });
  }

  const losses = r.avoidable_losses.slice(0, 2);
  if (losses.length) out.push({
    id: "losses", chapter: "What it cost", mood: "grave",
    lines: ["Some of what you lost could have been avoided.", ...losses.map((l) => dot(`You lost ${l.amount} ${l.unit} at ${lowerFirst(l.event)}, ${l.clock}.${l.caused_by ? ` I trace that to decision ${l.caused_by.index + 1}, ${l.caused_by.label}.` : ""}${l.alternative ? ` Choosing ${l.alternative} would have avoided it.` : ""}`))],
    card: { kicker: "Avoidable losses", heading: "What could have been saved", chips: [], rows: losses.map((l) => ({ label: l.event, value: `−${l.amount}`, tone: "bad" as Tone })) },
  });

  if (r.reveal.records_overstated_by > 0) out.push({
    id: "reveal", chapter: "What you could not know", mood: "grave",
    lines: ["Now I can tell you something you were never shown while you played.", `Your records claimed ${r.reveal.recorded_units} lots of cargo. In truth there were ${r.reveal.true_units}. The records were overstated by ${r.reveal.records_overstated_by}, and only ${r.reveal.verified_units} had been verified.`, "Checking before you trust a record is the oldest lesson there is."],
    card: { kicker: "The reveal", heading: "The records were wrong", chips: [], rows: [{ label: "Recorded", value: String(r.reveal.recorded_units), tone: "plain" }, { label: "Truly there", value: String(r.reveal.true_units), tone: "plain" }, { label: "Verified", value: String(r.reveal.verified_units), tone: "good" }] },
  });

  const focus = r.focus_next.slice(0, 2);
  if (focus.length) out.push({
    id: "focus", chapter: "What to improve", mood: "pointed",
    lines: ["If you play this again, here is where to put your attention.", ...focus.map((f) => dot(`${f.category}, which scored ${Math.round(f.score)}. ${clip(f.advice, 220)}`))],
    card: { kicker: "Focus next", heading: "Where to improve", chips: [], rows: focus.map((f) => ({ label: f.category, value: String(Math.round(f.score)), tone: (f.score >= 50 ? "mid" : "bad") as Tone })) },
  });

  out.push({ id: "close", chapter: "Carry this forward", mood: "warm", lines: ["Every number I read to you was calculated from what you did. No machine guessed at it.", "The written report holds every detail, and you can rewind to any decision and choose again. Go well."] });
  return out;
}
