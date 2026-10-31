import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Intro, LibraryItem, Outcome, RunView, SimReport, SimsApi } from "../api/sims";
import { Shell } from "./Shell";

const item = (id: LibraryItem["id"], over: Partial<LibraryItem> = {}): LibraryItem => ({
  id, title: { blackout: "BLACKOUT: The NotPetya Incident", bhopal: "Bhopal: Industrial Safety", covid: "COVID-era Hospital" }[id], tagline: "tag", role: "role",
  domain: "domain", minutes: 20, description: "desc", objectives: ["o1"], style: id, status: "none", completed: 0, ...over,
});
const meters = [{ id: "insight", label: "Understanding of the record", value: 20, good: "high" as const, hint: "" }, { id: "capacity", label: "Bed capacity headroom", value: 55, good: "high" as const, hint: "" }];
const view = (n: number, status = "active"): RunView => ({
  run: { id: "r1", sim_id: "covid", status, attempt: 1 }, scenario: { id: "covid", title: "COVID-era Hospital", role: "Lead", disclaimer: "d" },
  scene: { meters, flags: [], round: n, total_rounds: 2, status: status === "active" ? "active" : "completed",
    step: { id: "c1", title: `Step ${n} title`, clock: "Day 3", kind: "hypothetical", brief: "brief", question: "What do you do?", facts: ["a fact"], part: "", scene: "triage", sources: [],
      choices: [{ id: "c1_strong", label: "Structured plan", summary: "", available: true, reason: "" }, { id: "c1_weak", label: "Wing it", summary: "", available: true, reason: "" }] } },
  decisions: [],
});
const outcome: Outcome = { choice_id: "c1_strong", label: "Structured plan", rating: "strong", consequence: "It went well.", lesson: "Agree a method.", changes: { capacity: [55, 60] }, completed: false, events: [] };

function fake(over: Partial<SimsApi> = {}): SimsApi {
  return {
    library: vi.fn().mockResolvedValue([item("blackout"), item("bhopal", { status: "active", progress: "Step 3 of 13", percent: 15 }), item("covid", { status: "completed", progress: "Completed", percent: 100, run_id: "r9" })]),
    journey: vi.fn().mockResolvedValue({ completed: [], skills: [] }),
    profile: vi.fn().mockResolvedValue({ name: "Asha", large_text: false, reduce_motion: false }),
    saveProfile: vi.fn().mockImplementation(async (p) => ({ name: "Asha", large_text: false, reduce_motion: false, ...p })),
    intro: vi.fn().mockResolvedValue({ ...item("covid"), intro: ["You are the lead."], disclaimer: "Educational only.", rounds: 2, parts: [] } as unknown as Intro),
    current: vi.fn().mockResolvedValue(null), start: vi.fn().mockResolvedValue(view(1)),
    decide: vi.fn().mockResolvedValue({ outcome, view: view(2) }), report: vi.fn().mockRejectedValue(new Error("no report")), ...over,
  };
}

beforeEach(() => { window.location.hash = ""; document.documentElement.removeAttribute("data-large-text"); });

describe("library", () => {
  it("lists the three simulations with progress and the right action", async () => {
    render(<Shell api={fake()} />);
    expect(await screen.findByRole("heading", { name: /welcome back, asha/i })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    const bhopal = screen.getByRole("article", { name: /bhopal/i });
    expect(within(bhopal).getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(within(bhopal).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "15");
    const covid = screen.getByRole("article", { name: /covid/i });
    expect(within(covid).getByRole("button", { name: "View report" })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("article", { name: /blackout/i })).getByRole("button", { name: "Start" }));
    expect(window.location.hash).toBe("#/sim/blackout");
  });
  it("shows an error with a retry when the service is unreachable", async () => {
    const api = fake({ library: vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue([item("covid")]) });
    render(<Shell api={api} />);
    expect(await screen.findByText("offline")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findAllByRole("article")).toHaveLength(1);
  });
});

describe("player", () => {
  it("runs intro, decision, consequence and moves to the next step", async () => {
    window.location.hash = "#/sim/covid";
    const api = fake();
    render(<Shell api={api} />);
    await userEvent.click(await screen.findByRole("button", { name: "Begin" }));
    expect(await screen.findByRole("heading", { name: "Step 1 title" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /make your decision/i }));
    const confirm = screen.getByRole("button", { name: "Confirm decision" });
    expect(confirm).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/structured plan/i));
    await userEvent.click(confirm);
    expect(api.decide).toHaveBeenCalledWith("r1", "c1_strong");
    expect(await screen.findByText("It went well.")).toBeInTheDocument();
    expect(screen.getByText(/Bed capacity headroom: 55 → 60/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Step 2 title" })).toBeInTheDocument();
  });
  it("offers to continue an unfinished run", async () => {
    window.location.hash = "#/sim/covid";
    const api = fake({ current: vi.fn().mockResolvedValue(view(2)) });
    render(<Shell api={api} />);
    await userEvent.click(await screen.findByRole("button", { name: /continue where you left off \(step 2 of 2\)/i }));
    expect(await screen.findByRole("heading", { name: "Step 2 title" })).toBeInTheDocument();
    expect(api.start).not.toHaveBeenCalled();
  });
  it("goes to the report after the last decision", async () => {
    window.location.hash = "#/sim/covid";
    const api = fake({ decide: vi.fn().mockResolvedValue({ outcome: { ...outcome, completed: true }, view: view(2, "completed") }) });
    render(<Shell api={api} />);
    await userEvent.click(await screen.findByRole("button", { name: "Begin" }));
    await userEvent.click(await screen.findByRole("button", { name: /make your decision/i }));
    await userEvent.click(await screen.findByLabelText(/structured plan/i));
    await userEvent.click(screen.getByRole("button", { name: "Confirm decision" }));
    await userEvent.click(await screen.findByRole("button", { name: /career experience report/i }));
    expect(window.location.hash).toBe("#/report/r1");
  });
});

describe("report, journey, settings", () => {
  const rep: SimReport = {
    simulation: "COVID-era Hospital", simulation_id: "covid", role: "Lead", run_id: "r1", outcome: { id: "held", title: "The hospital held", text: "Good.", tone: "good" },
    final_meters: [], summary: { decisions: 2, strong: 1, mixed: 0, weak: 1 },
    major_decisions: [{ step: "The first surge", part: "", chose: "Structured plan", rating: "strong", consequence: "ok" }], challenges: [{ title: "Patients wait", text: "In corridors.", round: 3 }],
    skills: [{ id: "teamwork", label: "Teamwork", percent: 80, level: "Strong", decisions_counted: 2, explanation: "Because.", evidence: [] }],
    improve: [{ step: "Oxygen", chose: "Wait", why: "A call is a start.", stronger_option: "Audit use", rating: "weak" }], focus_areas: [], lessons: ["Agree criteria."],
    sources: [], recommended_next: { id: "bhopal", title: "Bhopal", reason: "Study safeguards." }, note: "Not a judgement of suitability.",
  };
  it("shows every required section of the career experience report", async () => {
    window.location.hash = "#/report/r1";
    render(<Shell api={fake({ report: vi.fn().mockResolvedValue(rep) })} />);
    for (const h of ["The hospital held", "Major decisions", "Key challenges you faced", "Skills shown by your decisions", "Areas for improvement", "Important lessons", "Recommended next"])
      expect(await screen.findByRole("heading", { name: h })).toBeInTheDocument();
    expect(screen.getByText(/A stronger option was: “Audit use”/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open it" }));
    expect(window.location.hash).toBe("#/sim/bhopal");
  });
  it("journey has an empty state, and settings are saved and applied", async () => {
    window.location.hash = "#/journey";
    const { unmount } = render(<Shell api={fake()} />);
    expect(await screen.findByText("Nothing completed yet")).toBeInTheDocument();
    unmount();
    window.location.hash = "#/settings";
    const api = fake();
    render(<Shell api={api} />);
    await userEvent.click(await screen.findByLabelText("Larger text"));
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledWith({ large_text: true }));
    await waitFor(() => expect(document.documentElement.dataset.largeText).toBe("true"));
  });
});
