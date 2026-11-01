import { describe, expect, it } from "vitest";
import type { Choice } from "../../api/types";
import { buildReaction, linesOf, moodFor } from "./reaction";

const c = (id: string, cost: number, time_cost: number): Choice => ({ id, label: `Option ${id}.`, summary: "", cost, time_cost, confirm: false, available: true, reason: "" });
const choices = [c("a", 0.5, 40), c("b", 1, 20), c("c", 1.5, 0)];

describe("choice reactions", () => {
  it("uses the team's stance when they gave one, the analyst first", () => {
    expect(moodFor(choices[1], choices, [{ id: "kavya", verdict: "support" }, { id: "arjun", verdict: "oppose" }], "arjun")).toBe("oppose");
    expect(moodFor(choices[1], choices, [{ id: "kavya", verdict: "support" }], "arjun")).toBe("support");
  });
  it("otherwise reads it from the cost: priciest is cautious, cheapest is calm, the rest neutral", () => {
    expect(moodFor(choices[2], choices, [], "arjun")).toBe("caution");
    expect(moodFor(choices[0], choices, [], "arjun")).toBe("support");
    expect(moodFor(choices[1], choices, [], "arjun")).toBe("neutral");
  });
  it("scripts a different reaction for different stances, with the choice's own words and numbers", () => {
    const ok = buildReaction(choices[0], choices, [{ id: "arjun", verdict: "support" }], "arjun");
    const bad = buildReaction(choices[0], choices, [{ id: "arjun", verdict: "oppose" }], "arjun");
    expect(linesOf(ok)[0].text).toContain("Option a");
    expect(ok.steps.find((s) => s.sfx)!.sfx).not.toBe(bad.steps.find((s) => s.sfx)!.sfx);
    expect(bad.steps.some((s) => s.shake)).toBe(true); expect(ok.steps.some((s) => s.shake)).toBe(false);
    const poses = (r: typeof ok) => r.steps.flatMap((s) => [...s.during, ...(s.after ?? [])]).filter((b) => b.who === "adv").map((b) => b.pose);
    expect(poses(bad)).toContain("angry"); expect(poses(ok)).toContain("determined");
    expect(linesOf(bad).some((l) => l.who === "third")).toBe(true);
  });
  it("is spoken in order: the Lead announces, then the advisor reacts (a line starts only when the one before has ended)", () => {
    const r = buildReaction(choices[1], choices, [], "nisha");
    expect(linesOf(r).map((l) => l.who).slice(0, 2)).toEqual(["lead", "adv"]);
    expect(r.steps.filter((s) => s.line).length).toBe(linesOf(r).length);
    expect(r.steps[r.steps.length - 1].line).toBeUndefined();                    // ends on a gesture, not on a line
  });
  it("is deterministic", () => {
    expect(JSON.stringify(buildReaction(choices[1], choices, [], "nisha"))).toBe(JSON.stringify(buildReaction(choices[1], choices, [], "nisha")));
  });
});
