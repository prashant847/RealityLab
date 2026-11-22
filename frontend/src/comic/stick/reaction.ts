import type { Choice } from "../../api/types";
import type { SpritePose } from "./StickSprite";

/** How an actor moves on a beat, besides changing pose. */
export type Fx = "hop" | "shake" | "lean" | "none";
export type Who = "lead" | "adv" | "third";
export interface Beat { who: Who; pose: SpritePose; fx?: Fx }
export type Mood = "support" | "caution" | "oppose" | "neutral";

/**
 * One step of the scene. A step with a `line` starts when the step before it has finished (when its voice stops, or after a reading-length pause if
 * there is no voice): the speaker's bubble shows the line and stays up until that speaker says something else. `during` beats play as it starts,
 * `after` beats when the line ends. A step without a line is a short beat of its own.
 */
export interface Step { line?: { who: Who; text: string }; during: Beat[]; after?: Beat[]; sfx?: string; shake?: boolean; pauseMs?: number }
export interface Reaction { mood: Mood; steps: Step[] }

/** Held after the last line, so nobody misses what was said, before the scene closes. */
export const HOLD_MS = 2400;
export const GAP_MS = 350;

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = <T,>(xs: T[], seed: string) => xs[hash(seed) % xs.length];
const trim = (s: string) => s.replace(/[.\s]+$/, "");
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * How the advisor takes the choice. If the player asked the team for advice, the advisors' own stance wins (the round's analyst first).
 * Otherwise it is read from the choice itself: the priciest option draws a worried reaction, the cheapest a calm one.
 */
export function moodFor(choice: Choice, choices: Choice[], stances: { id: string; verdict: Mood }[], analyst: string): Mood {
  const given = stances.find((s) => s.id === analyst && s.verdict !== "neutral") ?? stances.find((s) => s.verdict !== "neutral");
  if (given) return given.verdict;
  const costs = [...choices].map((c) => c.cost + c.time_cost / 60).sort((a, b) => a - b);
  if (costs.length < 2) return "neutral";
  const mine = choice.cost + choice.time_cost / 60, rank = costs.findIndex((c) => c >= mine) / (costs.length - 1);
  return rank >= 0.99 ? "caution" : rank <= 0.01 ? "support" : "neutral";
}

export function buildReaction(choice: Choice, choices: Choice[], stances: { id: string; verdict: Mood }[], analyst: string): Reaction {
  const mood = moodFor(choice, choices, stances, analyst);
  const price = choice.cost > 0 ? `${num(choice.cost)} effort ${choice.cost === 1 ? "point" : "points"}` : "no effort points";
  const time = choice.time_cost > 0 ? `${choice.time_cost} ${choice.time_cost === 1 ? "minute" : "minutes"}` : "no delay";
  const seed = choice.id;
  const lead = `Let's do it: ${trim(choice.label)}.`;
  const adv: Record<Mood, string[]> = {
    support: [`Good call. ${cap(price)}, ${time}. Worth it.`, "That's the one. I'm on it.", "Agreed. Let's move."],
    caution: [`Hmm. ${cap(price)}, ${time}. Watch the risks.`, "It could work. Just watch the cost.", "Okay... your call."],
    oppose: ["Are you sure? I'd have said no.", "That worries me. But you're the lead.", "Really?! ...Okay. Okay."],
    neutral: [`Understood. ${cap(price)}, ${time}.`, "Okay. Let's see what happens.", "Right. Moving."],
  };
  return compose(mood, lead, pick(adv[mood], seed), mood === "caution" ? pick(["Ouch.", "Hmm."], seed) : mood === "oppose" ? pick(["Whoa.", "Oh no."], seed) : null);
}

/**
 * The same scene with the words supplied: the lead announces, the advisor answers in their own voice and, for some moods, a bystander adds a word.
 * Used where the lines are written for a particular choice (the workday).
 */
export function compose(mood: Mood, lead: string, advText: string, thirdText: string | null): Reaction {
  const leadAfter: Record<Mood, Beat> = {
    support: { who: "lead", pose: "determined", fx: "hop" }, caution: { who: "lead", pose: "worried", fx: "lean" },
    oppose: { who: "lead", pose: "surprised", fx: "shake" }, neutral: { who: "lead", pose: "determined", fx: "none" },
  };
  const advSettled: Record<Mood, SpritePose> = { support: "determined", caution: "worried", oppose: "angry", neutral: "determined" };
  const advFinale: Record<Mood, SpritePose> = { support: "pointing", caution: "speaking", oppose: "speaking", neutral: "calm" };
  const thirdReact: Record<Mood, Beat> = {
    support: { who: "third", pose: "calm", fx: "hop" }, caution: { who: "third", pose: "worried", fx: "lean" },
    oppose: { who: "third", pose: "surprised", fx: "hop" }, neutral: { who: "third", pose: "calm", fx: "none" },
  };
  const sfx: Record<Mood, string> = { support: "YES!", caution: "HMM…", oppose: "UH-OH!", neutral: "DECIDED!" };

  const steps: Step[] = [
    { line: { who: "lead", text: lead }, during: [{ who: "lead", pose: "speaking", fx: "lean" }], after: [{ who: "lead", pose: "calm" }] },
    { line: { who: "adv", text: advText }, sfx: sfx[mood], shake: mood === "oppose",
      during: [{ who: "adv", pose: "speaking", fx: mood === "oppose" ? "shake" : "hop" }, leadAfter[mood], thirdReact[mood]],
      after: [{ who: "adv", pose: advSettled[mood], fx: "hop" }] },
  ];
  if (thirdText) steps.push({ line: { who: "third", text: thirdText }, during: [{ who: "third", pose: "speaking", fx: "lean" }], after: [thirdReact[mood]] });
  steps.push({ during: [{ who: "adv", pose: advFinale[mood], fx: "lean" }], pauseMs: 700 });
  return { mood, steps };
}

/** Every spoken line in order, for fetching the voices ahead of time. */
export const linesOf = (r: Reaction): { who: Who; text: string }[] => r.steps.flatMap((s) => (s.line ? [s.line] : []));
