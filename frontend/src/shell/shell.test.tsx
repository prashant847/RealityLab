import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CareersView, Career, CareerPhase, Intro, PrepItem, LibraryItem, Outcome, RunView, SimReport, SimsApi } from "../api/sims";
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

const prepItems: PrepItem[] = [
  { flag: "prep_stock", label: "Minimum stock levels", task: "The cupboard count (10:30)", status: "full", text: "You set minimum levels.", effects: ["Oxygen reserve +10"] },
  { flag: "prep_rota", label: "A rota with slack", task: "Sister Anita's rota (15:30)", status: "missed", text: "The rota was already stretched.", effects: [] },
];
const phase = (quality: number, enjoyment: number, stress: number, run = "r"): CareerPhase => ({ run_id: run, outcome: `Outcome ${quality}`, decisions: 7, strong: 5, mixed: 1, weak: 1, quality,
  reflection: { run_id: run, profession: "covid", phase: "workday", enjoyment, stress, daily_interest: enjoyment, note: "" } });
const career = (id: Career["id"], title: string, w: CareerPhase | null, c: CareerPhase | null, skills: Record<string, number> = {}): Career => ({
  id, title, field: "Field", setting: "A setting", tagline: "A tagline", daily: { workday: ["ordinary task"], crisis: ["crisis task"] }, problems: { workday: ["small problem"], crisis: ["big problem"] },
  decisions: { tempo: [2, 5], information: [4, 2], stakes: [3, 5], reversibility: [4, 2], text: { workday: "Calm choices.", crisis: "Hard choices." } }, pressure: { workday: 2, crisis: 5, text: { workday: "Steady.", crisis: "Intense." } },
  communication: { with: ["Families"], text: { workday: "Talking.", crisis: "Telling the truth." } }, rewards: ["Impact"], costs: ["Hours"], skills_required: { teamwork: 5, communication: 4 },
  you: { phases: { workday: w, crisis: c }, skills, complete: Boolean(w && c) },
});
const careersView: CareersView = {
  careers: [career("blackout", "Operations lead", phase(60, 3, 4, "b1"), null), career("bhopal", "Safety manager", phase(80, 4, 3, "h1"), phase(90, 4, 4, "h2"), { teamwork: 70 }),
            career("covid", "Hospital doctor", phase(100, 5, 2, "c1"), phase(40, 5, 5, "c2"), { teamwork: 80, communication: 60 })],
  skills: { teamwork: "Teamwork", communication: "Communication" }, dimensions: [], choice: null, note: "This compares how you did and felt in each simulated job. It is not career advice.",
};

function fake(over: Partial<SimsApi> = {}): SimsApi {
  return {
    library: vi.fn().mockResolvedValue([item("blackout"), item("bhopal", { status: "active", progress: "Step 3 of 13", percent: 15 }), item("covid", { status: "completed", progress: "Completed", percent: 100, run_id: "r9" })]),
    journey: vi.fn().mockResolvedValue({ completed: [], skills: [] }),
    profile: vi.fn().mockResolvedValue({ name: "Asha", large_text: false, reduce_motion: false }),
    saveProfile: vi.fn().mockImplementation(async (p) => ({ name: "Asha", large_text: false, reduce_motion: false, ...p })),
    intro: vi.fn().mockResolvedValue({ ...item("covid"), intro: ["You are the lead."], disclaimer: "Educational only.", rounds: 2, parts: [] } as unknown as Intro),
    current: vi.fn().mockResolvedValue(null), start: vi.fn().mockResolvedValue(view(1)),
    decide: vi.fn().mockResolvedValue({ outcome, view: view(2) }), report: vi.fn().mockRejectedValue(new Error("no report")),
    reflection: vi.fn().mockResolvedValue(null),
    saveReflection: vi.fn().mockImplementation(async (run: string, r) => ({ run_id: run, profession: "covid", phase: "workday", ...r })),
    careers: vi.fn().mockResolvedValue(careersView), saveChoice: vi.fn().mockImplementation(async (career: string, reason: string) => (career ? { career, reason, updated_at: "2026-01-01" } : null)), ...over,
  };
}

beforeEach(() => { window.location.hash = ""; document.documentElement.removeAttribute("data-large-text"); });

describe("library", () => {
  it("lists the three simulations with progress and the right action", async () => {
    render(<Shell api={fake()} />);
    expect(await screen.findByRole("heading", { name: /welcome back, asha/i })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    const bhopal = screen.getByRole("article", { name: /bhopal/i });
    expect(within(bhopal).getByRole("button", { name: "Continue the crisis" })).toBeInTheDocument();
    expect(within(bhopal).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "15");
    const covid = screen.getByRole("article", { name: /covid/i });
    expect(within(covid).getByRole("button", { name: "View report" })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("article", { name: /blackout/i })).getByRole("button", { name: "Start with a normal day" }));
    expect(window.location.hash).toBe("#/workday/blackout");
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
    window.location.hash = "#/crisis/covid";
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
    window.location.hash = "#/crisis/covid";
    const api = fake({ current: vi.fn().mockResolvedValue(view(2)) });
    render(<Shell api={api} />);
    await userEvent.click(await screen.findByRole("button", { name: /continue where you left off \(step 2 of 2\)/i }));
    expect(await screen.findByRole("heading", { name: "Step 2 title" })).toBeInTheDocument();
    expect(api.start).not.toHaveBeenCalled();
  });
  it("goes to the report after the last decision", async () => {
    window.location.hash = "#/crisis/covid";
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


describe("workday, crisis and career comparison", () => {
  it("the library offers the normal day first, then the crisis", async () => {
    const wd = (status: "none" | "active" | "completed") => ({ id: "covid_workday", title: "A day", tagline: "t", minutes: 15, rounds: 7, status });
    const api = fake({ library: vi.fn().mockResolvedValue([item("blackout", { workday: wd("completed") }), item("bhopal", { workday: wd("active") }), item("covid", { workday: wd("none") })]) });
    render(<Shell api={api} />);
    expect(await within(await screen.findByRole("article", { name: /blackout/i })).findByRole("button", { name: "Begin the crisis" })).toBeInTheDocument();
    expect(within(screen.getByRole("article", { name: /bhopal/i })).getByRole("button", { name: "Continue the day" })).toBeInTheDocument();
    expect(within(screen.getByRole("article", { name: /covid/i })).getByRole("button", { name: "Start with a normal day" })).toBeInTheDocument();
  });
  it("shows the path of one profession as two separate parts, with no interval between them", async () => {
    window.location.hash = "#/sim/covid";
    render(<Shell api={fake({ library: vi.fn().mockResolvedValue([item("covid", { workday: { id: "covid_workday", title: "A day", tagline: "A calm day", minutes: 15, rounds: 7, status: "none" } })]) })} />);
    expect(await screen.findByRole("heading", { name: "A normal day" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The crisis" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "The interval" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start the day" }));
    expect(window.location.hash).toBe("#/workday/covid");
  });
  it("the crisis intro says what the normal day set up", async () => {
    window.location.hash = "#/crisis/covid";
    const intro = { ...item("covid"), intro: ["You are the lead."], disclaimer: "Educational only.", rounds: 8, parts: [], kind: "crisis", profession: "covid", prep: { workday_done: true, items: prepItems, earned: 1, total: 2 } } as unknown as Intro;
    render(<Shell api={fake({ intro: vi.fn().mockResolvedValue(intro) })} />);
    expect(await screen.findByText(/Your normal day set up 1 of 2 things/)).toBeInTheDocument();
    expect(screen.getByText("Minimum stock levels")).toBeInTheDocument();
    expect(screen.queryByText("A rota with slack")).toBeNull();                         // only what was actually set up is listed
  });
  it("without a workday the crisis intro offers the day first, but the crisis can still be played", async () => {
    window.location.hash = "#/crisis/covid";
    const intro = { ...item("covid"), intro: ["x"], disclaimer: "d", rounds: 8, parts: [], kind: "crisis", profession: "covid", prep: { workday_done: false, items: [], earned: 0, total: 7 } } as unknown as Intro;
    render(<Shell api={fake({ intro: vi.fn().mockResolvedValue(intro) })} />);
    expect(await screen.findByText(/You have not played the normal day/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Play it first/ })).toHaveAttribute("href", "#/workday/covid");
    expect(screen.getByRole("button", { name: "Begin" })).toBeEnabled();
  });
  it("saves a reflection from the report, then goes straight to the crisis", async () => {
    window.location.hash = "#/report/w1";
    const rep = { simulation: "A Day at Riverside", simulation_id: "covid_workday", profession: "covid", kind: "workday", role: "Lead", run_id: "w1", outcome: { id: "ready", title: "Ready for what comes", text: "Good.", tone: "good" },
      final_meters: [], summary: { decisions: 7, strong: 7, mixed: 0, weak: 0 }, major_decisions: [], challenges: [], skills: [], improve: [], focus_areas: [], lessons: ["Rehearse."], sources: [],
      recommended_next: { id: "covid", title: "COVID-era Hospital", reason: "Now the crisis.", to: "crisis" }, note: "n", prep: prepItems } as unknown as SimReport;
    const api = fake({ report: vi.fn().mockResolvedValue(rep) });
    render(<Shell api={api} />);
    expect(await screen.findByRole("heading", { name: "What this day set up for the crisis" })).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save my answers" });
    expect(save).toBeDisabled();
    for (const q of ["How much did you enjoy this?", "How stressful did it feel?", "Could you see yourself doing this kind of work, day to day?"])
      await userEvent.click(within(screen.getByRole("radiogroup", { name: q })).getByRole("radio", { name: "4" }));
    await userEvent.click(save);
    expect(api.saveReflection).toHaveBeenCalledWith("w1", { enjoyment: 4, stress: 4, daily_interest: 4, note: "" });
    expect(await screen.findByText(/Saved\. You can compare careers/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Begin the crisis" }));
    expect(window.location.hash).toBe("#/crisis/covid");
  });
  it("comparison needs both parts of at least two jobs, and says what is left to play", async () => {
    window.location.hash = "#/compare";
    const one = { ...careersView, careers: careersView.careers.map((c) => (c.id === "bhopal" ? career("bhopal", "Safety manager", phase(80, 4, 3), null) : c.id === "covid" ? career("covid", "Hospital doctor", null, null) : c)) };
    render(<Shell api={fake({ careers: vi.fn().mockResolvedValue(one) })} />);
    expect(await screen.findByText(/Finish both parts of at least two jobs to compare how you did/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play the normal day" })).toBeInTheDocument();      // hospital doctor: nothing played yet
    expect(screen.getAllByRole("button", { name: "Play the crisis" }).length).toBe(2);            // the others have only the normal day
  });
  it("compares how you did: both parts side by side, honest signals, and your own saved choice", async () => {
    window.location.hash = "#/compare";
    const api = fake();
    render(<Shell api={api} />);
    expect(await screen.findByRole("heading", { name: "How did you do in each job?" })).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Careers to compare" });
    expect(within(group).getByRole("button", { name: /Operations lead/ })).toHaveTextContent("Finish both parts to compare");   // not complete: cannot be compared
    expect(screen.getByRole("article", { name: "Hospital doctor" })).toHaveTextContent("Outcome 100");
    expect(screen.getByRole("article", { name: "Hospital doctor" })).toHaveTextContent("Outcome 40");
    expect(screen.getByRole("article", { name: "Hospital doctor" })).toHaveTextContent("decisions dropped by 60 points");
    expect(screen.getByRole("article", { name: "Safety manager" })).toHaveTextContent("decisions improved by 10 points");
    const signalsBox = screen.getByRole("region", { name: "What your results show" });
    expect(signalsBox).toHaveTextContent("Under pressure, you did best as: Safety manager (90%)");
    expect(signalsBox).toHaveTextContent("Your results point in different directions");           // hospital: best average quality; safety: best under pressure
    const choice = screen.getByRole("region", { name: "Your choice" });
    expect(within(choice).getByRole("button", { name: "Save my choice" })).toBeDisabled();
    await userEvent.click(within(choice).getByRole("radio", { name: "Safety manager" }));
    await userEvent.type(within(choice).getByLabelText(/Why\?/), "I liked the walk-rounds");
    await userEvent.click(within(choice).getByRole("button", { name: "Save my choice" }));
    expect(api.saveChoice).toHaveBeenCalledWith("bhopal", "I liked the walk-rounds");
    expect(await within(choice).findByRole("status")).toHaveTextContent("You said: Safety manager");
    await userEvent.click(within(choice).getByRole("button", { name: "Clear" }));
    expect(api.saveChoice).toHaveBeenLastCalledWith("", "");
  });
  it("keeps the plain comparison of the jobs as a second view", async () => {
    window.location.hash = "#/compare";
    render(<Shell api={fake()} />);
    await userEvent.click(await screen.findByRole("tab", { name: "About the jobs" }));
    expect(await screen.findByRole("heading", { name: "What is each job really like?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Workplace pressure" }));
    expect(screen.getAllByRole("img", { name: "5 out of 5" }).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("tab", { name: "Skills required" }));
    expect(screen.getAllByRole("img", { name: "5 out of 5" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("note")).toHaveTextContent("not career advice");
  });
});
