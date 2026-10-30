import { NpPerson, type Expr, type Who } from "./notpetya/Cast";
import { characterInfo } from "./assets";
import type { Emotion } from "./art/emotion";
import type { CharacterId, Expression } from "./types";

const WHO: Record<CharacterId, Who> = { player: "director", arjun: "arjun", kavya: "kavya", nisha: "nisha", raghav: "raghav", isha: "isha" };
const EMOTION: Partial<Record<string, Expr>> = { composure: "neutral", concern: "concern", frustration: "frustration", fear: "shock", fatigue: "tired" };
const EXPRESSION: Partial<Record<Expression, Expr>> = { calm: "neutral", worried: "concern", angry: "frustration", surprised: "shock", determined: "determination", exhausted: "tired", speaking: "concentration", pointing: "concentration" };

/** Head-and-shoulders portrait: the same flat figure the comic uses, cropped, so a character looks identical everywhere. */
export function Portrait({ id, emotion = "composure", expression }: { id: CharacterId; emotion?: Emotion; expression?: Expression }) {
  const expr = (expression && expression !== "calm" ? EXPRESSION[expression] : undefined) ?? EMOTION[emotion] ?? "neutral";
  return <NpPerson who={WHO[id]} expression={expr} bust label={characterInfo(id).name} />;
}
