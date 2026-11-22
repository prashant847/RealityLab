import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Outcome, RunView, Step } from "../../api/sims";
import { LabOutcome, LabStep, isLabStep } from "./LabStep";

const ids = ["lc1", "lc2", "lc3", "lc4", "lc5", "lc6", "lc7", "ls1", "ls2", "ls3", "ls4", "ls5", "ls6", "ls7"];
const step = (id: string): Step => ({
  id, title: "Choose the LED resistor", clock: "Bench · step 1 of 7", kind: "simulation", brief: "The job: a battery-powered indicator light.", question: "Which resistor goes in series with the LED?",
  facts: ["A red LED drops about 2 V.", "The nearest standard value is 330 Ω."], part: "", scene: id, sources: [], voice: null,
  choices: [
    { id: `${id}_mixed`, label: "Leave the resistor out", summary: "", available: true, reason: "" },
    { id: `${id}_strong`, label: "Use a 330 Ω resistor", summary: "", available: true, reason: "" },
    { id: `${id}_weak`, label: "Use a 100 kΩ resistor", summary: "", available: true, reason: "" },
  ],
});
const view = (st: Step): RunView => ({ run: { id: "r1", sim_id: "circuit", status: "active", attempt: 1 }, scenario: { id: "circuit", title: "Build a Circuit", role: "", disclaimer: "" }, scene: { meters: [{ id: "progress", label: "Build progress", value: 0, good: "high", hint: "" }], flags: [], round: 1, total_rounds: 7, status: "active", step: st }, decisions: [] } as never);

describe("the technical labs", () => {
  it("has a detailed picture for every step of both", () => {
    for (const id of ids) { expect(isLabStep(id)).toBe(true); expect(existsSync(join(__dirname, "../../../public/assets/scene/lab", `${id}.webp`)), id).toBe(true); }
    expect(isLabStep("bw1")).toBe(false);
  });

  it("shows the step with the narrator's picture, three plain options (no hints) and a status tab", () => {
    const { container } = render(<LabStep view={view(step("lc1"))} picked={null} busy={false} onPick={() => undefined} onConfirm={() => undefined} />);
    expect(container.querySelector(".lab-frame img")?.getAttribute("src")).toContain("lab/lc1.webp");
    expect(container.querySelectorAll(".bo-rail .decision").length).toBe(3);
    expect(container.querySelector(".bo-rail .decision-summary")).toBeNull();
    expect(container.textContent).toContain("The job: a battery-powered indicator light.");
    fireEvent.click(screen.getByRole("tab", { name: "Status" }));
    expect(screen.getByText("Build progress")).toBeInTheDocument();
  });

  it("picks and commits an option", () => {
    const onPick = vi.fn(), onConfirm = vi.fn();
    render(<LabStep view={view(step("lc1"))} picked="lc1_strong" busy={false} onPick={onPick} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("radio", { name: /Use a 100 kΩ/ }));
    expect(onPick).toHaveBeenCalledWith("lc1_weak");
    fireEvent.click(screen.getByRole("button", { name: "Commit decision" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("on a failure stamps FAILED, says what would have worked, and offers to try again", () => {
    const prev = view(step("lc1"));
    const outcome: Outcome = { choice_id: "lc1_mixed", label: "Leave the resistor out", rating: "weak", consequence: "Nothing limits the current, so the LED burns out.", lesson: "An LED needs a series resistor.", changes: {}, completed: true, events: [] };
    const onRetry = vi.fn();
    const { container } = render(<LabOutcome outcome={outcome} prev={prev} view={prev} onNext={() => undefined} onRetry={onRetry} />);
    expect(container.querySelector(".lab-stamp--fail")?.textContent).toBe("Failed");
    expect(screen.getByText(/What would have worked:/).parentElement?.textContent).toContain("Use a 330 Ω resistor");
    fireEvent.click(screen.getByRole("button", { name: "Try again from step 1" }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "See what went wrong" })).toBeInTheDocument();
  });

  it("on success stamps WORKS and goes on to the next step", () => {
    const prev = view(step("lc1"));
    const outcome: Outcome = { choice_id: "lc1_strong", label: "Use a 330 Ω resistor", rating: "strong", consequence: "About 9 mA flows.", lesson: "", changes: { progress: [0, 14] }, completed: false, events: [] };
    const { container } = render(<LabOutcome outcome={outcome} prev={prev} view={prev} onNext={() => undefined} onRetry={() => undefined} />);
    expect(container.querySelector(".lab-stamp--ok")?.textContent).toBe("Works");
    expect(screen.getByRole("button", { name: "Next step" })).toBeInTheDocument();
    expect(container.querySelector(".lab-right")).toBeNull();
  });
});
