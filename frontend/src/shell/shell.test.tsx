import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CareersView, Career, Intro, IntervalView, LibraryItem, Outcome, RunView, SimReport, SimsApi } from "../api/sims";
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

const intervalView: IntervalView = {
  profession: "covid", title: "COVID-era Hospital", workday_title: "A Day at Riverside", workday_done: true, workday_run_id: "w1", narrative: ["Eleven weeks later.", "The wards fill."],
  items: [{ flag: "prep_stock", label: "Minimum stock levels", task: "The cupboard count (10:30)", status: "full", text: "You set minimum levels.", effects: ["Oxygen reserve +10"] },
          { flag: "prep_rota", label: "A rota with slack", task: "Sister Anita's rota (15:30)", status: "missed", text: "The rota was already stretched.", effects: [] }], earned: 1, total: 2,
};
const career = (id: Career["id"], title: string, w: number, c: number, you: Career["you"]): Career => ({
  id, title, field: "Field", setting: "A setting", tagline: "A tagline", daily: { workday: ["ordinary task"], crisis: ["crisis task"] }, problems: { workday: ["small problem"], crisis: ["big problem"] },
  decisions: { tempo: [2, 5], information: [4, 2], stakes: [3, 5], reversibility: [4, 2], text: { workday: "Calm choices.", crisis: "Hard choices." } }, pressure: { workday: w, crisis: c, text: { workday: "Steady.", crisis: "Intense." } },
  communication: { with: ["Families"], text: { workday: "Talking.", crisis: "Telling the truth." } }, rewards: ["Impact"], costs: ["Hours"], skills_required: { teamwork: 5, communication: 4 }, you,
});
const careersView: CareersView = {
  careers: [career("blackout", "Operations lead", 3, 5, { phases: { workday: null, crisis: null }, skills: {} }),
            career("bhopal", "Safety manager", 2, 5, { phases: { workday: null, crisis: null }, skills: {} }),
            career("covid", "Hospital doctor", 2, 5, { phases: { workday: { run_id: "w1", outcome: "Ready for what comes", decisions: 7, strong: 5, mixed: 1, weak: 1, reflection: { run_id: "w1", profession: "covid", phase: "workday", enjoyment: 5, stress: 2, daily_interest: 4, note: "" } }, crisis: null }, skills: { teamwork: 80 } })],
  skills: { teamwork: "Teamwork", communication: "Communication" }, dimensions: [], note: "This compares what the simulations show of each job. It is not career advice.",
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
    interval: vi.fn().mockResolvedValue(intervalView), reflection: vi.fn().mockResolvedValue(null),
    saveReflection: vi.fn().mockImplementation(async (run: string, r) => ({ run_id: run, profession: "covid", phase: "workday", ...r })),
    careers: vi.fn().mockResolvedValue(careersView), ...over,
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


describe("workday, interval and career comparison", () => {
  it("the library offers the ordinary day first, then the interval, then the crisis", async () => {
    const wd = (status: "none" | "active" | "completed") => ({ id: "covid_workday", title: "A day", tagline: "t", minutes: 15, rounds: 7, status });
    const api = fake({ library: vi.fn().mockResolvedValue([item("blackout", { workday: wd("completed") }), item("bhopal", { workday: wd("active") }), item("covid", { workday: wd("none") })]) });
    render(<Shell api={api} />);
    expect(await within(await screen.findByRole("article", { name: /blackout/i })).findByRole("button", { name: "Go to the interval" })).toBeInTheDocument();
    expect(within(screen.getByRole("article", { name: /bhopal/i })).getByRole("button", { name: "Continue the day" })).toBeInTheDocument();
    expect(within(screen.getByRole("article", { name: /covid/i })).getByRole("button", { name: "Start with a normal day" })).toBeInTheDocument();
  });
  it("shows the path of one profession and starts the workday from it", async () => {
    window.location.hash = "#/sim/covid";
    render(<Shell api={fake({ library: vi.fn().mockResolvedValue([item("covid", { workday: { id: "covid_workday", title: "A day", tagline: "A calm day", minutes: 15, rounds: 7, status: "none" } })]) })} />);
    expect(await screen.findByRole("heading", { name: "A normal day" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The interval" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The crisis" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start the day" }));
    expect(window.location.hash).toBe("#/workday/covid");
  });
  it("the interval says what the workday set up and what it missed, then begins the crisis", async () => {
    window.location.hash = "#/interval/covid";
    render(<Shell api={fake()} />);
    expect(await screen.findByRole("heading", { name: "Some time later…" })).toBeInTheDocument();
    expect(screen.getByText("Minimum stock levels")).toBeInTheDocument();
    expect(screen.getByText("Oxygen reserve +10")).toBeInTheDocument();
    expect(screen.getByLabelText("Not set up")).toBeInTheDocument();
    expect(screen.getByLabelText("1 of 2 set up")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Begin the crisis" }));
    expect(window.location.hash).toBe("#/crisis/covid");
  });
  it("without a workday the interval invites you to do it first, but lets you skip", async () => {
    window.location.hash = "#/interval/blackout";
    render(<Shell api={fake({ interval: vi.fn().mockResolvedValue({ ...intervalView, profession: "blackout", workday_done: false, earned: 0, items: intervalView.items.map((i) => ({ ...i, status: "missed" as const })) }) })} />);
    expect(await screen.findByRole("button", { name: "Do the ordinary day first" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Skip to the crisis" }));
    expect(window.location.hash).toBe("#/play/blackout");
  });
  it("saves a reflection from the report and shows what the workday set up", async () => {
    window.location.hash = "#/report/w1";
    const rep = { simulation: "A Day at Riverside", simulation_id: "covid_workday", profession: "covid", kind: "workday", role: "Lead", run_id: "w1", outcome: { id: "ready", title: "Ready for what comes", text: "Good.", tone: "good" },
      final_meters: [], summary: { decisions: 7, strong: 7, mixed: 0, weak: 0 }, major_decisions: [], challenges: [], skills: [], improve: [], focus_areas: [], lessons: ["Rehearse."], sources: [],
      recommended_next: { id: "covid", title: "COVID-era Hospital", reason: "Cross the interval.", to: "interval" }, note: "n", prep: intervalView.items } as unknown as SimReport;
    const api = fake({ report: vi.fn().mockResolvedValue(rep) });
    render(<Shell api={api} />);
    expect(await screen.findByRole("heading", { name: "What this day set up for the crisis" })).toBeInTheDocument();
    expect(screen.getByText("Minimum stock levels")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save my answers" });
    expect(save).toBeDisabled();
    for (const q of ["How much did you enjoy this?", "How stressful did it feel?", "Could you see yourself doing this kind of work, day to day?"])
      await userEvent.click(within(screen.getByRole("radiogroup", { name: q })).getByRole("radio", { name: "4" }));
    await userEvent.click(save);
    expect(api.saveReflection).toHaveBeenCalledWith("w1", { enjoyment: 4, stress: 4, daily_interest: 4, note: "" });
    expect(await screen.findByText(/Saved\. You can compare careers/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continue to the interval" }));
    expect(window.location.hash).toBe("#/interval/covid");
  });
  it("compares careers: needs two, and puts what you experienced beside each job", async () => {
    window.location.hash = "#/compare";
    render(<Shell api={fake()} />);
    expect(await screen.findByRole("heading", { name: "What is each job really like?" })).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Careers to compare" });
    expect(within(group).getAllByRole("button", { pressed: true })).toHaveLength(3);
    await userEvent.click(within(group).getByRole("button", { name: /Operations lead/ }));
    await userEvent.click(within(group).getByRole("button", { name: /Safety manager/ }));       // the last two cannot be deselected
    expect(within(group).getAllByRole("button", { pressed: true })).toHaveLength(2);
    expect(screen.getByText(/an ordinary day with 7 decisions/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Workplace pressure" }));
    expect(screen.getAllByRole("img", { name: "5 out of 5" }).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("tab", { name: "Skills required" }));
    expect(screen.getByRole("meter", { name: "Teamwork shown in Hospital doctor" })).toHaveAttribute("aria-valuenow", "80");
    await userEvent.click(screen.getByRole("tab", { name: "What stood out" }));
    expect(screen.getByText(/Highest pressure in a crisis|Biggest jump/)).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("not career advice");
  });
});
