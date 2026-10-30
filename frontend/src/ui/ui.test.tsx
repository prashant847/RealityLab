import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Choice } from "../api/types";
import { completedGood, completedPartial, deadEndHard, deadEndSoft, roundViews } from "../fixtures";
import { DeadEndScreen } from "./DeadEndScreen";
import { DecisionList } from "./DecisionCard";
import { EventPanel } from "./EventPanel";
import { OutcomeReport } from "./OutcomeReport";
import { RecoveryTimeline } from "./RecoveryTimeline";
import { SimulationHUD } from "./SimulationHUD";
import { StakeholderCard } from "./StakeholderCard";

const choice = (over: Partial<Choice>): Choice => ({
  id: "r1_a", label: "Option A", summary: "Does A.", cost: 0.5, time_cost: 10, confirm: false, available: true, reason: "", ...over,
});
const actions = { onRewind: vi.fn(), onTimeline: vi.fn(), onRestart: vi.fn(), onContinue: vi.fn() };

describe("DecisionList", () => {
  const choices = [choice({ id: "r1_a", label: "Option A" }), choice({ id: "r1_b", label: "Option B", cost: 0 }),
    choice({ id: "r1_c", label: "Option C", available: false, reason: "Needs ₹6.0 lakh; only ₹1.0 lakh remains." })];

  it("is a keyboard-operable radio group; commit stays disabled until something is selected", async () => {
    const onCommit = vi.fn();
    render(<DecisionList choices={choices} onCommit={onCommit} />);
    const group = screen.getByRole("radiogroup", { name: "Available decisions" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Select an option" })).toBeDisabled();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("radio", { name: /Option A/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("button", { name: "Commit decision" }));
    expect(onCommit).toHaveBeenCalledWith("r1_a");
  });

  it("selects with number keys and skips unavailable options, showing why", async () => {
    render(<DecisionList choices={choices} onCommit={vi.fn()} />);
    await userEvent.tab();
    await userEvent.keyboard("2");
    expect(screen.getByRole("radio", { name: /Option B/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("3");                                  // option C is unavailable
    expect(screen.getByRole("radio", { name: /Option B/ })).toHaveAttribute("aria-checked", "true");
    const c = screen.getByRole("radio", { name: /Option C/ });
    expect(c).toHaveAttribute("aria-disabled", "true");
    expect(c).toHaveAccessibleDescription("Needs ₹6.0 lakh; only ₹1.0 lakh remains.");
    await userEvent.click(c);
    expect(c).toHaveAttribute("aria-checked", "false");
  });

  it("requires a second explicit confirmation for consequential decisions", async () => {
    const onCommit = vi.fn();
    render(<DecisionList choices={[choice({ id: "r2_x", label: "Risky", confirm: true })]} onCommit={onCommit} />);
    await userEvent.click(screen.getByRole("radio", { name: /Risky/ }));
    await userEvent.click(screen.getByRole("button", { name: "Commit decision" }));
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("lasting consequences");
    await userEvent.click(screen.getByRole("button", { name: "Confirm decision" }));
    expect(onCommit).toHaveBeenCalledWith("r2_x");
  });

  it("disables committing while the backend is busy", async () => {
    render(<DecisionList choices={choices} busy onCommit={vi.fn()} />);
    await userEvent.click(screen.getByRole("radio", { name: /Option A/ }));
    expect(screen.getByRole("button", { name: "Applying…" })).toBeDisabled();
  });

  it("renders the real round-1 choices from the backend with cost and time chips", () => {
    render(<DecisionList choices={roundViews[0].scene.choices!} onCommit={vi.fn()} />);
    expect(screen.getByText("₹0.5 lakh")).toBeInTheDocument();
    expect(screen.getByText("40 min")).toBeInTheDocument();
  });
});

describe("SimulationHUD", () => {
  it("exposes each meter with an accessible value and marks the hospital need", () => {
    render(<SimulationHUD state={roundViews[0].state} clock="8:40 PM" round={1} />);
    expect(screen.getByRole("meter", { name: "Emergency budget" })).toHaveAttribute("aria-valuetext", "₹12.0 lakh");
    expect(screen.getByRole("meter", { name: "Time slack" })).toHaveAttribute("aria-valuenow", "300");
    expect(screen.getByText("Round 1 of 10")).toBeInTheDocument();
    expect(screen.getAllByTitle("Required")).toHaveLength(2);
  });

  it("changes tone as values fall", () => {
    const low = { ...roundViews[0].state, staff_safety: 40, budget: 0.5, window_min: 10 };
    const { container } = render(<SimulationHUD state={low} />);
    const tones = [...container.querySelectorAll(".meter")].map((m) => m.getAttribute("data-tone"));
    expect(tones.filter((t) => t === "bad").length).toBeGreaterThanOrEqual(3);
  });
});

describe("StakeholderCard", () => {
  it("shows name, role, trust and an optional advice button", async () => {
    const onAsk = vi.fn();
    render(<StakeholderCard id="kavya" trust={72} onAsk={onAsk} quote="Evacuate first." />);
    expect(screen.getByRole("article", { name: "Kavya Rao, Safety Chief" })).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Kavya Rao trust" })).toHaveAttribute("aria-valuenow", "72");
    await userEvent.click(screen.getByRole("button", { name: "Ask Kavya Rao for advice" }));
    expect(onAsk).toHaveBeenCalled();
    expect(screen.getByText("Evacuate first.")).toBeInTheDocument();
  });
});

describe("DeadEndScreen", () => {
  it("shows the required title and actions, and no 'continue' on a hard dead end", () => {
    render(<DeadEndScreen analysis={deadEndHard.analysis!} rewindsLeft={5} actions={actions} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("DEAD END — RECOVERY WINDOW CLOSED");
    expect(screen.getByRole("button", { name: "REWIND TO LAST RECOVERABLE DECISION" })).toBeEnabled();
    for (const name of ["Review my mistakes", "View decision timeline", "Restart entire simulation"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Continue despite the risk" })).toBeNull();
  });

  it("offers 'continue despite the risk' only when a degraded path remains", async () => {
    render(<DeadEndScreen analysis={deadEndSoft.analysis!} rewindsLeft={2} actions={actions} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue despite the risk" }));
    expect(actions.onContinue).toHaveBeenCalled();
  });

  it("explains the causal chain from recorded data, including what was known at the time", () => {
    render(<DeadEndScreen analysis={deadEndSoft.analysis!} rewindsLeft={2} actions={actions} />);
    expect(screen.getByRole("region", { name: /Why it is unrecoverable/ })).toHaveTextContent("170 units");
    const critical = screen.getByRole("region", { name: /The critical point/ });
    expect(critical).toHaveTextContent("What you knew then");
    expect(critical).toHaveTextContent("The hospitals together need 220 units");
    expect(critical).toHaveTextContent("Options that still kept recovery possible");
    expect(screen.getByLabelText("Decision timeline")).toBeInTheDocument();
  });

  it("disables rewind with an explanation when none remain, and wires the other buttons", async () => {
    const a = { onRewind: vi.fn(), onTimeline: vi.fn(), onRestart: vi.fn() };
    render(<DeadEndScreen analysis={deadEndHard.analysis!} rewindsLeft={0} actions={a} />);
    expect(screen.getByRole("button", { name: "REWIND TO LAST RECOVERABLE DECISION" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("No rewinds remain");
    await userEvent.click(screen.getByRole("button", { name: "View decision timeline" }));
    await userEvent.click(screen.getByRole("button", { name: "Restart entire simulation" }));
    expect(a.onTimeline).toHaveBeenCalled(); expect(a.onRestart).toHaveBeenCalled();
  });

  it("'Review my mistakes' opens the decision-by-decision review", async () => {
    const { container } = render(<DeadEndScreen analysis={deadEndSoft.analysis!} rewindsLeft={2} actions={actions} />);
    const details = container.querySelector("details")!;
    expect(details.open).toBe(false);
    Element.prototype.scrollIntoView = vi.fn();
    await userEvent.click(screen.getByRole("button", { name: "Review my mistakes" }));
    expect(details.open).toBe(true);
    expect(details).toHaveTextContent("Closed the recovery window");
  });

  it("does not use shaming language", () => {
    const { container } = render(<DeadEndScreen analysis={deadEndHard.analysis!} rewindsLeft={5} actions={actions} />);
    expect(container.textContent).not.toMatch(/\b(stupid|fool|incompetent|failure of yours|your fault|careless)\b/i);
  });
});

describe("RecoveryTimeline", () => {
  it("marks the critical decision and the rewind target", () => {
    const a = deadEndSoft.analysis!;
    const { container } = render(<RecoveryTimeline analysis={a} />);
    expect(container.querySelectorAll("li")).toHaveLength(a.timeline.length);
    expect(container.querySelector(".tl--critical")).toHaveTextContent("Recovery window closed here");
    expect(container.querySelector(".tl--last")).toBeInTheDocument();
  });
});

describe("OutcomeReport", () => {
  it("reports what shipped against need for a full recovery", () => {
    render(<OutcomeReport final={completedGood.scene.final!} state={completedGood.state} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("FULL RECOVERY");
    expect(screen.getByRole("meter", { name: "Hospitals" })).toHaveAttribute("aria-valuenow", "220");
    expect(screen.getAllByText("Need met")).toHaveLength(2);
  });

  it("shows shortfalls honestly for a partial dispatch and offers only the supplied actions", () => {
    const onRestart = vi.fn();
    render(<OutcomeReport final={completedPartial.scene.final!} state={completedPartial.state} onRestart={onRestart} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("PARTIAL DISPATCH");
    expect(screen.getAllByText(/units short/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /different decision/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Restart entire simulation" }));
    expect(onRestart).toHaveBeenCalled();
  });
});

describe("EventPanel", () => {
  it("builds a warning panel from a backend event and ignores unknown asset ids", () => {
    const ev = { event_id: "x", round: 3, clock: "9:35 PM", title: "Water at the loading dock", text: "Pallets lost.",
      assets: ["rain", "not_an_effect"], recovery_note: "", effects: ["Time slack −10 min"] };
    const { container } = render(<EventPanel event={ev} environment="loading_dock" />);
    expect(container.querySelector("svg.effects")).toHaveAttribute("data-effects", "rain");
    expect(screen.getByText(/Water at the loading dock/)).toBeInTheDocument();
    expect(screen.getByText("Time slack −10 min")).toBeInTheDocument();
  });
});
