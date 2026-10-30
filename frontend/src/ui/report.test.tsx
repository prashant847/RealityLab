import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { checkpointNine, comparison, reportGood, reportRisky } from "../fixtures";
import { ComparisonView } from "./ComparisonView";
import { ScoreReport } from "./ScoreReport";

describe("ScoreReport (real backend report)", () => {
  it("shows the overall score, its band and the sound/questionable/poor tally", () => {
    render(<ScoreReport report={reportRisky} />);
    expect(screen.getByRole("img", { name: /Overall score \d+(\.\d+)? out of 100, Weak/ })).toBeInTheDocument();
    expect(screen.getByText("Weak")).toBeInTheDocument();
    expect(screen.getByText("9 sound")).toBeInTheDocument();
    expect(screen.getByText("1 questionable")).toBeInTheDocument();
    expect(screen.getByText(/No AI is involved in scoring/)).toBeInTheDocument();
  });

  it("lists all eight categories with weights, meters and the formula behind each", () => {
    render(<ScoreReport report={reportRisky} />);
    const region = screen.getByRole("region", { name: "Scores by category" });
    expect(within(region).getAllByRole("meter")).toHaveLength(8);
    for (const name of ["Staff safety & risk management", "Inventory & evidence reliability", "Financial discipline", "Recovery speed",
      "Delivery prioritization", "Stakeholder coordination", "Communication quality", "Adaptability to new information"]) {
      expect(within(region).getByRole("meter", { name })).toBeInTheDocument();
    }
    expect(within(region).getAllByText("How this is calculated")).toHaveLength(8);
    expect(within(region).getByText(/staff_safety − 15/)).toBeInTheDocument();
    expect(within(region).getByText("25% of total")).toBeInTheDocument();
  });

  it("judges each decision by what was known: sound-but-warned, questionable, and the alternative offered", () => {
    render(<ScoreReport report={reportRisky} />);
    const review = screen.getByRole("region", { name: /Every decision, judged by what you knew then/ });
    const items = within(review).getAllByRole("listitem").filter((li) => li.getAttribute("data-rating"));
    expect(items).toHaveLength(10);
    expect(items[0]).toHaveTextContent("Warned by Arjun, Nisha");
    expect(items[0]).toHaveTextContent("Feasible, but Arjun and Nisha warned against it");
    expect(items[0]).toHaveTextContent("Isolate affected systems and preserve evidence");
    expect(items[0]).toHaveTextContent("recommended by Arjun");
    expect(items[9]).toHaveAttribute("data-rating", "questionable");
    expect(items[9]).toHaveTextContent("Final physical sweep, then dispatch");
  });

  it("separates avoidable losses (with the decision that enabled them) from chance, and lists missed opportunities", () => {
    render(<ScoreReport report={reportRisky} />);
    const avoid = screen.getByRole("region", { name: "Avoidable losses" });
    expect(avoid).toHaveTextContent("Systems fail again");
    expect(avoid).toHaveTextContent("Traced to decision 1");
    expect(avoid).toHaveTextContent("Avoidable by choosing “Isolate affected systems and preserve evidence”");
    const missed = screen.getByRole("region", { name: "Missed opportunities" });
    expect(missed).toHaveTextContent("insurer advance");
    expect(missed).toHaveTextContent("binding limit was verified stock");
  });

  it("shows strongest and most damaging decisions, alternatives and what to focus on", () => {
    render(<ScoreReport report={reportRisky} />);
    expect(screen.getByRole("region", { name: "Most damaging decisions" })).toHaveTextContent("Prioritize immediate restoration");
    expect(screen.getByRole("region", { name: "Strongest decisions" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Alternative strategies worth trying" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Where to focus next" })).toHaveTextContent("Financial discipline");
  });

  it("reveals the real stock only here, at the end", () => {
    render(<ScoreReport report={reportRisky} />);
    const reveal = screen.getByRole("region", { name: "What was really in the warehouse" });
    expect(reveal).toHaveTextContent(`Your records said ${reportRisky.reveal.recorded_units} units. There were ${reportRisky.reveal.true_units}`);
    expect(reveal).toHaveTextContent("Revealed only now");
  });

  it("shows a high score with no cap note for the cautious run", () => {
    render(<ScoreReport report={reportGood} />);
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("explains a score cap when one applies", () => {
    const capped = { ...reportGood, overall: { ...reportGood.overall, score: 40, band: "Weak", raw: 78, cap: "safety failure caps the overall score at 40" } };
    render(<ScoreReport report={capped} />);
    expect(screen.getByRole("note")).toHaveTextContent("safety failure caps the overall score at 40. Uncapped it would have been 78.");
  });

  it("shows progress across attempts only when there is more than one", () => {
    const { rerender } = render(<ScoreReport report={reportRisky} />);
    expect(screen.queryByRole("region", { name: "Progress across attempts" })).toBeNull();
    const two = { ...reportGood, attempts: [
      { run_id: "a", attempt: 1, kind: "main", status: "dead_end", ending: null, score: null, decisions: 2, quality: { sound: 1, questionable: 0, poor: 1, unlucky: 0, lucky: 0 }, active: false, label: "Attempt 1" },
      { run_id: "b", attempt: 2, kind: "rewind", status: "completed", ending: "full_recovery", score: 86, decisions: 10, quality: { sound: 10, questionable: 0, poor: 0, unlucky: 0, lucky: 0 }, active: true, label: "Attempt 2" }] };
    rerender(<ScoreReport report={two} />);
    const table = screen.getByRole("table");
    expect(within(table).getByRole("row", { name: /Attempt 1/ })).toHaveTextContent("Dead end");
    expect(within(table).getByRole("row", { name: /Attempt 2 \(current\)/ })).toHaveTextContent("full recovery");
    expect(within(table).getByRole("row", { name: /Attempt 2 \(current\)/ })).toHaveTextContent("86");
  });

  it("renders any text as plain text", () => {
    const evil = { ...reportRisky, decisions: reportRisky.decisions.map((d, i) => (i === 0 ? { ...d, verdict: "<img src=x onerror=alert(1)>" } : d)) };
    const { container } = render(<ScoreReport report={evil} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
  });
});

describe("ComparisonView (real backend comparison)", () => {
  it("shows both outcomes, every required measure and which side is better", () => {
    render(<ComparisonView c={comparison} />);
    const table = screen.getByRole("table", { name: "Outcome measures for both attempts" });
    for (const m of ["Delivery completion", "Remaining budget", "Staff safety", "System recovery", "Inventory confidence (verified share)",
      "Public trust", "Time remaining", "Critical events triggered", "Ending achieved", "Overall score"]) {
      expect(within(table).getByRole("rowheader", { name: m })).toBeInTheDocument();
    }
    const delivery = within(table).getByRole("row", { name: /Hospital units shipped/ });
    expect(delivery).toHaveTextContent("170");
    expect(delivery).toHaveTextContent("220");
    expect(within(delivery).getByText(/\(better\)/)).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Time remaining/ })).toHaveTextContent("−30 min");
    expect(within(table).getByRole("row", { name: /Ending achieved/ })).toHaveTextContent("HOSPITALS SERVED");
  });

  it("says where the timelines diverge and shows both decisions side by side", () => {
    const { container } = render(<ComparisonView c={comparison} />);
    expect(screen.getByText(/first differ at decision 10/)).toBeInTheDocument();
    expect(screen.getByText(/Same seed and same starting conditions/)).toBeInTheDocument();
    const rows = container.querySelectorAll("ol.cmp-timeline > li");
    expect(rows).toHaveLength(10);
    expect(rows[9]).toHaveTextContent("Dispatch verified stock only");
    expect(rows[9]).toHaveTextContent("Final physical sweep, then dispatch");
    expect(rows[0]).toHaveTextContent("Same decision");
    expect(rows[9]).not.toHaveTextContent("Same decision");
  });

  it("includes an accessible readiness chart for both timelines", () => {
    render(<ComparisonView c={comparison} />);
    expect(screen.getByRole("img", { name: /Readiness after each decision\. Attempt 1 ends at .*Attempt 2 ends at/ })).toBeInTheDocument();
  });

  it("handles a dead-end run with no delivery figures", () => {
    const c = { ...comparison, base: { ...comparison.base, status: "dead_end", ending: "Dead end — recovery window closed" },
      metrics: comparison.metrics.map((m) => (m.metric === "delivery_completion" ? { ...m, base: null, delta: null, favours: null } : m)) };
    render(<ComparisonView c={c} />);
    expect(screen.getByRole("row", { name: /Delivery completion/ })).toHaveTextContent("—");
    expect(screen.getByText(/ended in a dead end/)).toBeInTheDocument();
  });

  it("calls onClose", async () => {
    const onClose = vi.fn();
    render(<ComparisonView c={comparison} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("checkpoint fixture", () => {
  it("is the final decision with exactly one chosen option marked", () => {
    expect(checkpointNine.choices.filter((c) => c.chosen)).toHaveLength(1);
  });
});
