import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ChoiceCutscene } from "../../comic/stick/ChoiceCutscene";
import type { Step } from "../../api/sims";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PEOPLE, WORKDAY, isWorkdayStep, personIn, workdayReaction } from "./workdayData";
import { WorkdayStep } from "./WorkdayStep";
import { ADVICE, OPINIONS } from "./workdayAdvice";
import { linesOf } from "../../comic/stick/reaction";

const step = (id: string): Step => ({ id, title: "Morning briefing", clock: "07:30", kind: "workday", brief: "A vessel is due.", question: "How do you run it?", facts: ["One fact.", "Another fact."], choices: [], part: "", scene: "ops", sources: [], voice: { name: "Operations Manager", role: "Ops", line: "Give me a plan." } });

describe("the BLACKOUT workday comic", () => {
  it("covers every step of the four told-as-comic stories, each with a room picture that exists, a cast with the lead, and replies for every kind of choice", () => {
    const ids = Object.keys(WORKDAY);
    expect(ids.filter((i) => i.startsWith("bow"))).toHaveLength(7);   // BLACKOUT's day
    expect(ids.filter((i) => /^bw\d/.test(i))).toHaveLength(7);       // Bhopal's day
    expect(ids.filter((i) => /^[hf]\d/.test(i))).toHaveLength(13);    // Bhopal: the record and the crisis
    expect(ids.filter((i) => /^cw\d/.test(i))).toHaveLength(7);       // the hospital's day
    expect(ids.filter((i) => /^c\d/.test(i))).toHaveLength(8);        // the hospital's surge
    for (const [id, w] of Object.entries(WORKDAY)) {
      expect(existsSync(join(__dirname, "../../../public/assets/scene/workday", `${id}.webp`)), id).toBe(true);
      expect(w.cast.some((c) => c.who === "director"), id).toBe(true);
      expect(w.cast.some((c) => c.who === w.adv), `${id} adv in cast`).toBe(true);
      expect(w.replies.strong && w.replies.mixed && w.replies.weak, id).toBeTruthy();
      expect(personIn(id, w.adv).name, id).not.toBe("Colleague");
    }
    expect(isWorkdayStep("bow3")).toBe(true);
    expect(isWorkdayStep("nope")).toBe(false);
  });

  it("shows the step in the crisis layout: the comic in the stage, the options in the rail, with the full wording", () => {
    const st = step("bow1");
    st.choices = [{ id: "bow1_strong", label: "Ask each person for one risk and one need", summary: "About fifteen minutes.", available: true, reason: "" }];
    const view = { run: { id: "r1", sim_id: "blackout_workday", status: "active", attempt: 1 }, scenario: { id: "blackout_workday", title: "Day", role: "", disclaimer: "" }, scene: { meters: [], flags: [], round: 1, total_rounds: 7, status: "active", step: st }, decisions: [] } as never;
    const { container } = render(<WorkdayStep view={view} picked={null} busy={false} onPick={() => undefined} onConfirm={() => undefined} />);
    expect(container.querySelector(".bo-scene .bo-stage .paged-stage")).not.toBeNull();
    expect(container.querySelector(".bo-rail .decision")?.textContent).toContain("About fifteen minutes.");
    expect(container.querySelectorAll(".cut__fig").length).toBe(6);
    expect(container.textContent).toContain("A vessel is due.");
    expect(container.querySelectorAll(".pager-dots button").length).toBe(4);   // the scene, two facts, the question
  });

  it("answers each option in the colleague's voice: the lead announces, the colleague replies, and a shaky call gets one more reaction", () => {
    const strong = workdayReaction("bow2", "bow2_strong", "Approve a patching window this week.")!;
    expect(strong.reaction.mood).toBe("support");
    expect(linesOf(strong.reaction).map((l) => l.who)).toEqual(["lead", "adv"]);
    expect(linesOf(strong.reaction)[0].text).toBe("Let's do it: Approve a patching window this week.");
    const weak = workdayReaction("bow2", "bow2_weak", "Defer: the schedule is tight")!;
    expect(weak.reaction.mood).toBe("caution");
    expect(linesOf(weak.reaction).map((l) => l.who)).toEqual(["lead", "adv", "third"]);
    expect(workdayReaction("bow2", "bow2_odd", "x")).toBeNull();
    expect(workdayReaction("c1", "c1_a", "x")).toBeNull();
  });

  it("lets the choice scene be skipped, which submits the choice straight away and only once", () => {
    const onDone = vi.fn();
    const r = workdayReaction("bow1", "bow1_weak", "Skip the briefing")!;
    render(<ChoiceCutscene env="ops_office" bg="x.webp" label="Skip the briefing" reaction={r.reaction} who={{ adv: "nisha", third: "arjun" }} names={{ lead: "Lead", adv: "Ops", third: "IT" }} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("has an opinion from EVERY person in EVERY step, each backing one option and sometimes arguing against another, and the group does not all agree", () => {
    let neutral = 0;
    for (const [id, w] of Object.entries(WORKDAY)) {
      const ops = OPINIONS[id];
      expect(ops, id).toBeDefined();
      const everyone = Object.keys(PEOPLE[w.sim]).filter((k) => k !== "director").sort();
      expect(Object.keys(ops).sort(), id).toEqual(everyone);
      const backed = new Set<string>();
      for (const o of Object.values(ops)) {
        expect(o!.say.length, id).toBeGreaterThan(15);
        if (o!.for === null) { expect(o!.against, id).toBeNull(); neutral++; continue; }          // a neutral person takes no side
        expect(["strong", "mixed", "weak"]).toContain(o!.for);
        if (o!.against) { expect(o!.against).not.toBe(o!.for); expect(o!.why!.length, id).toBeGreaterThan(10); }
        backed.add(o!.for);
      }
      expect(backed.size, `${id}: not everyone should back the same option`).toBeGreaterThan(1);
      expect(w.adv in ops && w.third in ops, id).toBe(true);
      expect(ops[w.adv]!.for && ops[w.third]!.for, `${id}: the two advisers take a side`).toBeTruthy();
    }
    expect(neutral, "some people stay neutral").toBeGreaterThan(20);
  });

  it("gives every decision in every story two colleagues who can be asked what they would do", () => {
    for (const [id, w] of Object.entries(WORKDAY)) {
      const tips = ADVICE[id];
      expect(tips, id).toBeDefined();
      expect(tips.map((t) => t[0]).sort(), id).toEqual([w.adv, w.third].sort());
      for (const t of tips) { expect(t[2].length, id).toBeGreaterThan(20); expect([0, 1, 2]).toContain(t[1]); }
    }
    expect(Object.keys(ADVICE).sort()).toEqual(Object.keys(WORKDAY).sort());
  });

  it("lets you ask the team in the Team tab, and the views you asked for appear under the options (some take a side, some stay neutral)", () => {
    const st = step("bow1");
    st.choices = [
      { id: "bow1_strong", label: "Ask each person for one risk and one need", summary: "Fifteen minutes.", available: true, reason: "" },
      { id: "bow1_mixed", label: "Run the usual status round", summary: "Ten minutes.", available: true, reason: "" },
      { id: "bow1_weak", label: "Skip the briefing", summary: "Saves time.", available: true, reason: "" },
    ];
    const view = { run: { id: "r1", sim_id: "blackout_workday", status: "active", attempt: 1 }, scenario: { id: "blackout_workday", title: "Day", role: "", disclaimer: "" }, scene: { meters: [], flags: [], round: 1, total_rounds: 7, status: "active", step: st }, decisions: [] } as never;
    const { container } = render(<WorkdayStep view={view} picked={null} busy={false} onPick={() => undefined} onConfirm={() => undefined} />);
    expect(container.querySelectorAll(".wd-thoughts li").length).toBe(0);              // nothing is shown until you ask
    expect(container.querySelector(".decision-votes")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Team" }));
    const everyone = Object.keys(PEOPLE.blackout).filter((k) => k !== "director" && OPINIONS.bow1[k as keyof typeof OPINIONS.bow1]);
    expect(container.querySelectorAll(".wd-team > li").length).toBe(everyone.length);   // every worker is in the tab, each with an Ask button
    fireEvent.click(screen.getByRole("button", { name: "Ask Operations Manager what they think" }));
    fireEvent.click(screen.getByRole("tab", { name: "Decide" }));
    expect(container.querySelectorAll(".wd-thoughts li").length).toBe(1);               // only the one asked
    expect(container.querySelector(".wd-thoughts .wd-op-name b")?.textContent).toBe("Operations Manager");
    expect(container.querySelector(".decision-votes")).not.toBeNull();                  // and the option counts follow who has been asked
    fireEvent.click(screen.getByRole("tab", { name: "Team" }));
    fireEvent.click(screen.getByRole("button", { name: "Ask everyone" }));
    fireEvent.click(screen.getByRole("tab", { name: "Decide" }));
    expect(container.querySelectorAll(".wd-thoughts li").length).toBe(everyone.length);
  });
});
