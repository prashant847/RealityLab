import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CareersView, Career, CareerPhase, Intro, PrepItem, LibraryItem, Outcome, RunView, SimReport, SimsApi } from "../api/sims";
import { Shell } from "./Shell";
import { achievements, upNext } from "./achievements";
import { A11Y_KEY, getA11y, listenForDesktopZoom, setA11y } from "../a11y/a11y";
import { audio, AUDIO_KEY } from "../audio/audio";
import { WELCOME_KEY } from "./Welcome";

const item = (id: LibraryItem["id"], over: Partial<LibraryItem> = {}): LibraryItem => ({
  id, title: { blackout: "BLACKOUT: The NotPetya Incident", bhopal: "Bhopal: Industrial Safety", covid: "COVID-era Hospital" }[id], tagline: "tag", role: "role",
  domain: "domain", minutes: 20, description: "desc", objectives: ["o1"], style: id, status: "none", completed: 0, ...over,
});
const meters = [{ id: "insight", label: "Understanding of the record", value: 20, good: "high" as const, hint: "" }, { id: "capacity", label: "Bed capacity headroom", value: 55, good: "high" as const, hint: "" }];
const view = (n: number, status = "active"): RunView => ({
  run: { id: "r1", sim_id: "covid", status, attempt: 1 }, scenario: { id: "covid", title: "COVID-era Hospital", role: "Lead", disclaimer: "d" },
  scene: { meters, flags: [], round: n, total_rounds: 2, status: status === "active" ? "active" : "completed",
    step: { id: `s${n}`, title: `Step ${n} title`, clock: "Day 3", kind: "hypothetical", brief: "brief", question: "What do you do?", facts: ["a fact"], part: "", scene: "triage", sources: [], voice: { name: "Sister Anita Das", role: "Ward nurse lead", line: "Two of them worried me last night." },
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
    labs: vi.fn().mockResolvedValue([]),
    certificates: vi.fn().mockResolvedValue([]),
    generate: vi.fn(), generationJobs: vi.fn().mockResolvedValue({ enabled: true, jobs: [] }), generated: vi.fn().mockResolvedValue([]), deleteGenerated: vi.fn(),
    journey: vi.fn().mockResolvedValue({ completed: [], skills: [] }),
    profile: vi.fn().mockResolvedValue({ name: "Asha", large_text: false, reduce_motion: false }),
    saveProfile: vi.fn().mockImplementation(async (p) => ({ name: "Asha", large_text: false, reduce_motion: false, ...p })),
    intro: vi.fn().mockResolvedValue({ ...item("covid"), intro: ["You are the lead."], disclaimer: "Educational only.", rounds: 2, parts: [] } as unknown as Intro),
    current: vi.fn().mockResolvedValue(null), start: vi.fn().mockResolvedValue(view(1)),
    decide: vi.fn().mockResolvedValue({ outcome, view: view(2) }), report: vi.fn().mockRejectedValue(new Error("no report")),
    reflection: vi.fn().mockResolvedValue(null),
    employerRegister: vi.fn().mockResolvedValue({ token: "t", employer: { id: "e", email: "hr@acme.test", org: "Acme" } }), employerLogin: vi.fn().mockResolvedValue({ token: "t", employer: { id: "e", email: "hr@acme.test", org: "Acme" } }),
    employerLogout: vi.fn().mockResolvedValue({}), employerMe: vi.fn().mockResolvedValue({ id: "e", email: "hr@acme.test", org: "Acme" }), shortlist: vi.fn().mockResolvedValue([]),
    addCandidate: vi.fn(), setCandidateNote: vi.fn(), removeCandidate: vi.fn().mockResolvedValue({}), analytics: vi.fn().mockResolvedValue({ sim_id: "surgery", attempts: 0, mean: null, distribution: [], steps: [] }),
    sealReport: vi.fn().mockImplementation(async (run: string, candidate: string) => ({ code: `RL-${run.slice(0, 8)}-0a1b2c3d`, candidate, issued_at: "2026-01-05T10:00:00Z" })),
    verifyReport: vi.fn().mockResolvedValue({ valid: false, reason: "No sealed report with that code was found on this server." }),
    saveReflection: vi.fn().mockImplementation(async (run: string, r) => ({ run_id: run, profession: "covid", phase: "workday", ...r })),
    careers: vi.fn().mockResolvedValue(careersView), saveChoice: vi.fn().mockImplementation(async (career: string, reason: string) => (career ? { career, reason, updated_at: "2026-01-01" } : null)), ...over,
  };
}

beforeEach(() => { try { localStorage.setItem(WELCOME_KEY, "1"); } catch { /* ignore */ } window.location.hash = ""; document.documentElement.removeAttribute("data-large-text"); });

describe("library", () => {
  it("lists the three simulations with progress and the right action", async () => {
    render(<Shell api={fake()} />);
    expect(await screen.findByRole("heading", { name: /welcome back, asha/i })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    const bhopal = screen.getByRole("article", { name: /bhopal/i });
    expect(within(bhopal).getByRole("button", { name: "Continue or start new" })).toBeInTheDocument();
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
  it("opens the hospital's first step with a comic: once per run, always skippable, then the crisis layout with the decision", async () => {
    window.location.hash = "#/crisis/covid";
    const first = view(1);
    first.scene.step = { ...first.scene.step!, id: "c1" };
    const api = fake({ start: vi.fn().mockResolvedValue(first), current: vi.fn().mockResolvedValue(null) });
    localStorage.removeItem("rl.comic.r1.c1");
    const { unmount } = render(<Shell api={api} />);
    await userEvent.click(await screen.findByRole("button", { name: "Begin" }));
    expect(await screen.findByRole("group", { name: /Page 1 of 3/ })).toBeInTheDocument();     // the comic comes first
    expect(screen.queryByRole("heading", { name: "Step 1 title" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Skip the comic" }));
    expect(await screen.findByRole("heading", { name: "Step 1 title" })).toBeInTheDocument();    // then the step, as before
    expect(screen.getByRole("button", { name: /select an option/i })).toBeInTheDocument();         // the decision sits in the rail beside the comic, as in the crisis
    unmount();
    window.location.hash = "#/crisis/covid";
    render(<Shell api={fake({ start: vi.fn().mockResolvedValue(first), current: vi.fn().mockResolvedValue(first) })} />);
    await userEvent.click(await screen.findByRole("button", { name: /Continue where you left off/ }));
    expect(await screen.findByRole("heading", { name: "Step 1 title" })).toBeInTheDocument();    // already seen in this run: not shown again
    localStorage.removeItem("rl.comic.r1.c1");
  });

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
    await userEvent.click(await screen.findByRole("button", { name: "Read the written report instead" }));
    for (const h of ["Performance assessment report", "Executive summary", "Competency assessment", "Behavioural evidence", "Complete decision record", "Strengths", "Development areas", "Outcome and impact", "Key lessons for the candidate", "How to read this report", "Recommended next"])
      expect(await screen.findByRole("heading", { name: h })).toBeInTheDocument();
    expect(screen.getByText(/A stronger option was: “Audit use”/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open it" }));
    expect(window.location.hash).toBe("#/sim/bhopal");
  });
  it("the journey has an empty state", async () => {
    window.location.hash = "#/journey";
    render(<Shell api={fake()} />);
    expect(await screen.findByText("Nothing completed yet")).toBeInTheDocument();
  });
});


describe("workday, crisis and career comparison", () => {
  it("every card opens the path page, where you choose the normal day or the crisis", async () => {
    const wd = (status: "none" | "active" | "completed") => ({ id: "covid_workday", title: "A day", tagline: "t", minutes: 15, rounds: 7, status });
    const api = fake({ library: vi.fn().mockResolvedValue([item("blackout", { workday: wd("completed") }), item("bhopal", { workday: wd("active") }), item("covid", { workday: wd("none") })]) });
    render(<Shell api={api} />);
    const b = within(await screen.findByRole("article", { name: /blackout/i }));
    expect(b.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(within(screen.getByRole("article", { name: /bhopal/i })).getByRole("button", { name: "Continue or start new" })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("article", { name: /covid/i })).getByRole("button", { name: "Start" }));
    expect(window.location.hash).toBe("#/sim/covid");
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
    await userEvent.click(await screen.findByRole("button", { name: "Read the written report instead" }));
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


describe("polish: welcome, keyboard play, voices, feedback, milestones", () => {
  it("shows a short welcome tour on first launch, saves the name, and never again", async () => {
    window.location.hash = "#/";                                   // not whatever route the previous test left behind
    localStorage.removeItem(WELCOME_KEY);
    const api = fake();
    const { unmount } = render(<Shell api={api} />);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /Experience your future/ })).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/What should we call you/), "Asha");
    await userEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    expect(within(dialog).getByRole("heading", { name: /Every job has two sides/ })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Let's begin" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledWith({ name: "Asha" }));
    expect(localStorage.getItem(WELCOME_KEY)).toBe("1");
    unmount();
    render(<Shell api={fake()} />);
    await screen.findAllByRole("article");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("COVID Round 1 opens with its comic, then the original decision", async () => {
    window.location.hash = "#/crisis/covid";
    const first = view(1);
    first.run = { ...first.run, id: "r-gn" };
    first.scene.step = { ...first.scene.step!, id: "c1" };
    localStorage.removeItem("rl.comic.r-gn.c1");
    const api = fake({ start: vi.fn().mockResolvedValue(first), current: vi.fn().mockResolvedValue(null) });
    const { container } = render(<Shell api={api} />);
    await userEvent.click(await screen.findByRole("button", { name: "Begin" }));
    expect(await screen.findByRole("group", { name: /Page 1 of 3/ })).toBeInTheDocument();         // three comic pages
    expect(container.querySelectorAll(".cm-panel").length).toBeGreaterThanOrEqual(3);                  // several inked panels on the page
    await userEvent.click(screen.getByRole("button", { name: "Page 3" }));
    await userEvent.click(screen.getByRole("button", { name: "Make your decision →" }));
    expect(await screen.findByRole("heading", { name: "Step 1 title" })).toBeInTheDocument();      // the original step, unchanged
    expect(screen.getByRole("radio", { name: /structured plan/i })).toBeInTheDocument();           // and its choices, in the rail
    vi.unstubAllGlobals();
    localStorage.removeItem("rl.comic.r-gn.c1");
  });
  it("an open dialog keeps keyboard focus: the screen-change focus move never steals it", async () => {
    window.location.hash = "#/";
    localStorage.removeItem(WELCOME_KEY);
    render(<Shell api={fake()} />);
    const dialog = await screen.findByRole("dialog");
    await new Promise((r) => setTimeout(r, 250));                      // well past the 80 ms the shell waits before moving focus to the new screen
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
  it("can be skipped with Escape", async () => {
    localStorage.removeItem(WELCOME_KEY);
    render(<Shell api={fake()} />);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("a step has a voice, and can be played from the keyboard (A-C to choose, Enter to confirm, Enter to continue)", async () => {
    window.location.hash = "#/crisis/covid";
    const api = fake();
    render(<Shell api={api} />);
    await userEvent.click(await screen.findByRole("button", { name: "Begin" }));
    expect(await screen.findByText(/Two of them worried me last night/)).toBeInTheDocument();
    expect(screen.getByText("Ward nurse lead", { exact: false })).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");                                   // situation -> decision
    expect(screen.getByRole("button", { name: "Confirm decision" })).toBeDisabled();
    await userEvent.keyboard("a");
    expect(screen.getByRole("radio", { name: /Structured plan/ })).toBeChecked();
    await userEvent.keyboard("b");
    expect(screen.getByRole("radio", { name: /Wing it/ })).toBeChecked();
    await userEvent.keyboard("a{Enter}");
    expect(api.decide).toHaveBeenCalledWith("r1", "c1_strong");
    expect(await screen.findByText("It went well.")).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");                                   // outcome -> next step
    expect(await screen.findByRole("heading", { name: "Step 2 title" })).toBeInTheDocument();
  });
  it("shows what a decision changed as a +/- badge on the meter", async () => {
    window.location.hash = "#/crisis/covid";
    render(<Shell api={fake()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Begin" }));
    await userEvent.click(await screen.findByRole("button", { name: /make your decision/i }));
    await userEvent.click(screen.getByLabelText(/structured plan/i));
    await userEvent.click(screen.getByRole("button", { name: "Confirm decision" }));
    expect(await screen.findByLabelText("changed by 5")).toHaveTextContent("+5");
  });
  it("home suggests the next step and counts milestones; the journey lists them", async () => {
    render(<Shell api={fake()} />);
    const next = await screen.findByRole("button", { name: /Up next/ });
    expect(next).toHaveTextContent("Continue the crisis");
    expect(screen.getByText("milestones")).toBeInTheDocument();
    window.location.hash = "#/journey";
    expect(await screen.findByRole("region", { name: "Milestones" })).toHaveTextContent("First day on the job");
  });
  it("milestones are worked out from real progress, and up-next follows the sensible order", () => {
    const none = careersView.careers.map((c) => career(c.id, c.title, null, null));
    const lib = [item("blackout"), item("bhopal"), item("covid")];
    expect(achievements(none, lib, null).filter((b) => b.earned)).toHaveLength(0);
    const earned = achievements(careersView.careers, lib, { career: "covid", reason: "", updated_at: "" }).filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(expect.arrayContaining(["first_day", "both_sides", "explorer", "comparer", "decider", "reflective"]));
    expect(upNext(lib, none, null)).toMatchObject({ label: "Start with a normal day", to: "#/workday/blackout" });
    const wd = (status: "completed" | "active") => ({ id: "x_workday", title: "d", tagline: "t", minutes: 15, rounds: 7, status });
    expect(upNext([item("blackout", { workday: wd("active") })], none, null)).toMatchObject({ label: "Continue the day" });
    expect(upNext([item("bhopal", { workday: wd("completed") })], none, null)).toMatchObject({ label: "Begin the crisis", to: "#/crisis/bhopal" });
    const all = lib.map((l) => ({ ...l, status: "completed" as const, workday: wd("completed") }));
    expect(upNext(all, careersView.careers, null)).toMatchObject({ label: "Compare how you did", to: "#/compare" });
    expect(upNext(all, careersView.careers, { career: "covid", reason: "", updated_at: "" })).toBeNull();
  });
});


describe("starting: continue or start new, workday or crisis", () => {
  const wd = (status: "none" | "active" | "completed") => ({ id: "covid_workday", title: "A day", tagline: "A calm day", minutes: 15, rounds: 7, status, progress: status === "active" ? "Step 3 of 7" : undefined });
  const path = (workday: ReturnType<typeof wd>, crisis: "none" | "active" | "completed") => fake({ library: vi.fn().mockResolvedValue([item("covid", { status: crisis, progress: crisis === "active" ? "Step 2 of 8" : undefined, workday })]) });
  beforeEach(() => { sessionStorage.clear(); });

  it("a part in progress offers both Continue where you left off and Start new", async () => {
    window.location.hash = "#/sim/covid";
    render(<Shell api={path(wd("active"), "active")} />);
    const day = (await screen.findByRole("heading", { name: "A normal day" })).closest("li")!;
    const crisis = screen.getByRole("heading", { name: "The crisis" }).closest("li")!;
    expect(within(day as HTMLElement).getByRole("button", { name: "Continue where you left off" })).toBeInTheDocument();
    expect(within(day as HTMLElement).getByRole("button", { name: "Start new" })).toBeInTheDocument();
    await userEvent.click(within(crisis as HTMLElement).getByRole("button", { name: "Start new" }));
    expect(window.location.hash).toBe("#/crisis/covid");
  });
  it("a part that has not been started just starts, and a finished part can be played again or reported", async () => {
    window.location.hash = "#/sim/covid";
    render(<Shell api={path(wd("completed"), "none")} />);
    const day = (await screen.findByRole("heading", { name: "A normal day" })).closest("li") as HTMLElement;
    expect(within(day).getByRole("button", { name: "Play the day again" })).toBeInTheDocument();
    expect(within(day).queryByRole("button", { name: "Start new" })).toBeNull();
    expect(screen.getByRole("button", { name: "Begin the crisis" })).toBeInTheDocument();
  });
  it("Continue (chosen on the path page) resumes the run without the intro screen", async () => {
    window.location.hash = "#/workday/covid";
    sessionStorage.setItem("rl.go", "continue");
    const api = fake({ current: vi.fn().mockResolvedValue(view(3)) });
    render(<Shell api={api} />);
    expect(await screen.findByRole("heading", { name: "Step 3 title" })).toBeInTheDocument();           // straight into the run
    expect(api.start).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("rl.go")).toBeNull();                                                   // the choice applies once
  });
  it("Start new on the path page begins a fresh run straight away", async () => {
    window.location.hash = "#/workday/covid";
    sessionStorage.setItem("rl.go", "new");
    const api = fake({ current: vi.fn().mockResolvedValue(view(3)) });
    render(<Shell api={api} />);
    expect(await screen.findByRole("heading", { name: "Step 1 title" })).toBeInTheDocument();
    expect(api.start).toHaveBeenCalled();
  });
  it("opening BLACKOUT with a game in progress asks whether to continue or start new", async () => {
    window.location.hash = "#/play/blackout";
    localStorage.setItem("realitylab.simulationId", "abc");
    const api = fake({ library: vi.fn().mockResolvedValue([item("blackout", { status: "active", progress: "Round 4 of 10" })]) });
    render(<Shell api={api} />);
    expect(await screen.findByRole("heading", { name: "You have a game in progress" })).toBeInTheDocument();
    expect(screen.getByText(/Round 4 of 10/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start a new game" }));
    expect(localStorage.getItem("realitylab.simulationId")).toBeNull();                 // the old pointer is dropped; the old game stays in history
  });
  it("opening BLACKOUT with nothing in progress goes straight to its start screen", async () => {
    window.location.hash = "#/play/blackout";
    render(<Shell api={fake({ library: vi.fn().mockResolvedValue([item("blackout")]) })} />);
    await waitFor(() => expect(screen.queryByRole("heading", { name: "You have a game in progress" })).toBeNull());
  });
});


describe("accessibility and sound", () => {
  beforeEach(() => {
    localStorage.removeItem(A11Y_KEY); localStorage.removeItem(AUDIO_KEY);
    setA11y({ textSize: 100, contrast: "normal", colorblind: false, easyFont: false, bigTargets: false, readAloud: false, speechRate: 1 });
    audio.update({ music: true, sfx: true, musicVolume: 0.35, sfxVolume: 0.5 });
    delete (window as unknown as { rlDesktop?: unknown }).rlDesktop;
    window.location.hash = "#/settings";
  });
  const openTab = async (name: string) => { render(<Shell api={fake()} />); await userEvent.click(await screen.findByRole("tab", { name })); };

  it("settings are in sections, and the profile name can still be saved", async () => {
    const api = fake();
    render(<Shell api={api} />);
    const tabs = await screen.findByRole("tablist", { name: "Settings sections" });
    expect(within(tabs).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Profile", "Accessibility", "Sound", "About and shortcuts"]);
    await userEvent.clear(screen.getByLabelText(/Your name/)); await userEvent.type(screen.getByLabelText(/Your name/), "Ravi");
    await userEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(api.saveProfile).toHaveBeenCalledWith({ name: "Ravi" });
  });
  it("text size zooms the desktop window and is remembered", async () => {
    const setZoom = vi.fn();
    (window as unknown as { rlDesktop: unknown }).rlDesktop = { setZoom };
    await openTab("Accessibility");
    await userEvent.click(screen.getByRole("radio", { name: "150%" }));
    expect(setZoom).toHaveBeenLastCalledWith(1.5);
    expect(document.documentElement.dataset.textSize).toBe("150");
    expect(JSON.parse(localStorage.getItem(A11Y_KEY)!).textSize).toBe(150);
    expect(screen.getByRole("radio", { name: "150%" })).toBeChecked();
  });
  it("high contrast, colour-blind colours, easy font and larger buttons are switchable, and each applies to the whole window", async () => {
    await openTab("Accessibility");
    await userEvent.click(screen.getByRole("radio", { name: "High contrast" }));
    expect(document.documentElement.dataset.contrast).toBe("high");
    await userEvent.click(screen.getByRole("switch", { name: "Colour-blind friendly colours" }));
    expect(document.documentElement.dataset.colorblind).toBe("true");
    await userEvent.click(screen.getByRole("switch", { name: "Easy-reading font" }));
    expect(document.documentElement.dataset.easyfont).toBe("true");
    await userEvent.click(screen.getByRole("switch", { name: "Larger buttons and more space" }));
    expect(document.documentElement.dataset.targets).toBe("large");
    await userEvent.click(screen.getByRole("radio", { name: "Normal" }));
    expect(document.documentElement.dataset.contrast).toBe("normal");
  });
  it("reduce motion is saved to the profile, and read-aloud adds a speed control", async () => {
    const api = fake();
    render(<Shell api={api} />);
    await userEvent.click(await screen.findByRole("tab", { name: "Accessibility" }));
    await userEvent.click(screen.getByRole("switch", { name: "Reduce motion and animation" }));
    await waitFor(() => expect(api.saveProfile).toHaveBeenCalledWith({ reduce_motion: true }));
    expect(screen.queryByLabelText(/Reading speed/)).toBeNull();
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak: vi.fn(), cancel: vi.fn() };
    class U { constructor(public text: string) {} rate = 1; lang = ""; }
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = U;
    await userEvent.click(screen.getByRole("switch", { name: "Read-aloud buttons" }));
    expect(getA11y().readAloud).toBe(true);
    expect(await screen.findByText("Reading speed")).toBeInTheDocument();
  });
  it("keyboard zoom in the desktop app keeps the text size setting in step", () => {
    let cb: (f: number) => void = () => undefined;
    (window as unknown as { rlDesktop: unknown }).rlDesktop = { setZoom: vi.fn(), onZoom: (f: (n: number) => void) => { cb = f; } };
    listenForDesktopZoom();
    cb(1.76);
    expect(getA11y().textSize).toBe(175);
  });
  it("sound: music and effects have their own switches and volumes, kept on this computer", async () => {
    await openTab("Sound");
    expect(screen.getByRole("switch", { name: "Music" })).toBeChecked();
    await userEvent.click(screen.getByRole("switch", { name: "Music" }));
    expect(audio.getSettings().music).toBe(false);
    expect(screen.getByLabelText(/Music volume/)).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Effects volume/), { target: { value: "0.2" } });
    expect(audio.getSettings().sfxVolume).toBeCloseTo(0.2);
    expect(JSON.parse(localStorage.getItem(AUDIO_KEY)!)).toMatchObject({ music: false, sfx: true, sfxVolume: 0.2 });
  });
  it("every screen has a quick sound button, and the audio engine is safe where there is no audio at all", async () => {
    window.location.hash = "#/";
    render(<Shell api={fake()} />);
    const btn = await screen.findByRole("button", { name: /Sound is on/ });
    await userEvent.click(btn);
    expect(audio.getSettings()).toMatchObject({ music: false, sfx: false });
    expect(screen.getByRole("button", { name: /Sound is off/ })).toBeInTheDocument();
    expect(() => { audio.start(); audio.sfx("good"); audio.setMood("bhopal"); }).not.toThrow();       // jsdom has no AudioContext
    audio.update({ musicVolume: 7 });
    expect(audio.getSettings().musicVolume).toBe(1);                                                    // volumes are clamped
  });
  it("shortcuts and the accessibility statement are listed", async () => {
    await openTab("About and shortcuts");
    expect(screen.getByRole("heading", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    expect(screen.getByText(/works with the keyboard alone and with a screen reader/)).toBeInTheDocument();
  });
  it("read aloud speaks the situation of a step, and only when it is switched on", async () => {
    const speak = vi.fn();
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak, cancel: vi.fn() };
    class U { constructor(public text: string) {} rate = 1; lang = ""; }
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = U;
    window.location.hash = "#/crisis/covid";
    render(<Shell api={fake()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Begin" }));
    await screen.findByRole("heading", { name: "Step 1 title" });
    expect(screen.queryByRole("button", { name: /Read this aloud/ })).toBeNull();
    setA11y({ readAloud: true });
    const read = await screen.findByRole("button", { name: /Read this aloud/ });
    await userEvent.click(read);
    await waitFor(() => expect(speak).toHaveBeenCalled());
    expect((speak.mock.calls[0][0] as { text: string }).text).toContain("Two of them worried me last night");
    expect((speak.mock.calls[0][0] as { text: string }).text).toContain("brief");
  });
  it("pressing R reads whatever screen is open, not only the step screens", async () => {
    const speak = vi.fn();
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak, cancel: vi.fn(), getVoices: () => [] };
    class U { constructor(public text: string) {} rate = 1; lang = ""; voice: unknown = null; onstart: unknown; onend: unknown; onerror: unknown; }
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = U;
    setA11y({ readAloud: true });
    window.location.hash = "#/";
    render(<Shell api={fake()} />);
    await screen.findAllByRole("article");
    document.getElementById("main")!.innerText = "Choose a world to step into. Hello.";       // jsdom has no layout, so give it text to read
    await userEvent.keyboard("r");
    await waitFor(() => expect(speak).toHaveBeenCalled());
    expect((speak.mock.calls[0][0] as { text: string }).text).toContain("Choose a world to step into");
    expect(await screen.findByText(/Reading this screen aloud/)).toBeInTheDocument();
  });
  it("pressing R with read aloud off explains how to turn it on, and reads nothing", async () => {
    const speak = vi.fn();
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak, cancel: vi.fn(), getVoices: () => [] };
    class U { constructor(public text: string) {} rate = 1; lang = ""; }
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = U;
    window.location.hash = "#/";
    render(<Shell api={fake()} />);
    await screen.findAllByRole("article");
    await userEvent.keyboard("r");
    expect(await screen.findByText(/Read aloud is off\. Turn it on in Settings/)).toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });
});
