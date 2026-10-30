import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { ApiError, type GameApi, type HistoryResponse, type TimelineResponse } from "../api/client";
import type { SimulationView } from "../api/types";
import { adviceSamples, adviceUnverified, checkpointNine, comparison, completedGood, completedPartial, reportGood, deadEndHard, deadEndSoft, rewound, roundViews } from "../fixtures";
import type { Advice, StakeholderKey } from "../api/types";

const KEY = "realitylab.simulationId";

/** A scripted server built from real backend responses. `script[i]` is returned by the i-th decision. */
function fakeApi(script: SimulationView[] = roundViews.slice(1), over: Partial<GameApi> = {}, initial: SimulationView = roundViews[0]) {
  let i = 0;
  const calls: string[] = [];
  const rec = <T,>(name: string, v: T) => { calls.push(name); return Promise.resolve(v); };
  const state = () => (roundViews[0].state);
  const history = (v: SimulationView): HistoryResponse => ({
    run_id: v.run.id, status: v.run.status,
    decisions: (v.state as unknown as { decisions: { round: number; choice_id: string; label: string; clock: string; known_info: string[] }[] })
      .decisions.map((d, idx) => ({ index: idx, round: d.round, choice_id: d.choice_id, label: d.label, clock: d.clock, effects: ["Budget −0.5 lakh"], inherited: false, known_info: d.known_info })),
    events: (v.state as unknown as { events: { round: number; event_id: string; title: string; clock: string; text: string }[] })
      .events.map((e, idx) => ({ index: idx, round: e.round, event_id: e.event_id, title: e.title, clock: e.clock, text: e.text, effects: [], inherited: false })),
  });
  let current: SimulationView = initial;
  const given = new Map<StakeholderKey, Advice>();
  const api: GameApi = {
    create: vi.fn(async () => { calls.push("create"); current = roundViews[0]; return roundViews[0]; }),
    get: vi.fn(async () => rec("get", current)),
    decide: vi.fn(async (_id: string, choice: string) => { calls.push(`decide:${choice}`); current = script[i++]; return current; }),
    rewind: vi.fn(async (_id: string, idx?: number) => { calls.push(`rewind:${idx}`); current = rewound; return rewound; }),
    continueAnyway: vi.fn(async () => { calls.push("continue"); current = { ...deadEndSoft, run: { ...deadEndSoft.run, status: "active", accepted_risk: true }, analysis: null, scene: roundViews[5].scene }; return current; }),
    restart: vi.fn(async () => { calls.push("restart"); current = roundViews[0]; return roundViews[0]; }),
    history: vi.fn(async () => history(current)),
    timeline: vi.fn(async (): Promise<TimelineResponse> => ({
      simulation_id: "s", seed: 1, active_run_id: current.run.id, branches: [],
      runs: [{ run_id: current.run.id, kind: "main", attempt: 1, status: current.run.status, ending: null, parent_run_id: null, branch_checkpoint_index: null, active: true,
        decisions: history(current).decisions.map((d) => ({ index: d.index, round: d.round, clock: d.clock, choice_id: d.choice_id, label: d.label, inherited: false })),
        events: [], metrics: { budget: state().budget, staff_safety: 100, public_trust: 70, evidence_quality: 40 } }],
    })),
    advice: vi.fn(async (_id: string, who: StakeholderKey) => { calls.push(`advice:${who}`); const a = adviceSamples.find((x) => x.stakeholder === who)!; given.set(who, a); return a; }),
    adviceSoFar: vi.fn(async () => [...given.values()]),
    report: vi.fn(async () => { calls.push("report"); return reportGood; }),
    compare: vi.fn(async () => { calls.push("compare"); return comparison; }),
    checkpoint: vi.fn(async () => { calls.push("checkpoint"); return checkpointNine; }),
    replay: vi.fn(async () => { calls.push("replay"); return completedPartial; }),
    ...over,
  };
  return { api, calls, given };
}

const firstAvailable = () => screen.getAllByRole("radio").find((r) => r.getAttribute("aria-disabled") !== "true")!;
const choose = async (label: RegExp) => {
  await userEvent.click(screen.getByRole("radio", { name: label }));
  await userEvent.click(screen.getByRole("button", { name: /Commit decision|Confirm decision/ }));
};

beforeEach(() => { localStorage.clear(); window.location.hash = ""; Element.prototype.scrollIntoView = vi.fn(); });

describe("starting and playing", () => {
  it("starts a simulation from the start screen and shows the first scene from the server", async () => {
    const { api, calls } = fakeApi();
    render(<App api={api} />);
    expect(await screen.findByRole("heading", { name: "BLACKOUT" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Begin the simulation" }));
    expect(await screen.findByRole("heading", { name: "THE SCREENS GO DARK" })).toBeInTheDocument();
    expect(calls).toEqual(["create"]);
    expect(localStorage.getItem(KEY)).toBe(roundViews[0].simulation.id);
    expect(screen.getByRole("meter", { name: "Recovery effort" })).toHaveAttribute("aria-valuetext", "12.0 points");
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("passes a validated fixed seed and rejects an invalid one", async () => {
    const { api } = fakeApi();
    render(<App api={api} />);
    await userEvent.click(await screen.findByText("Advanced"));
    await userEvent.type(screen.getByLabelText(/Fixed seed/), "abc");
    expect(screen.getByRole("alert")).toHaveTextContent("whole number");
    expect(screen.getByRole("button", { name: "Begin the simulation" })).toBeDisabled();
    await userEvent.clear(screen.getByLabelText(/Fixed seed/));
    await userEvent.type(screen.getByLabelText(/Fixed seed/), "42");
    await userEvent.click(screen.getByRole("button", { name: "Begin the simulation" }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith(42));
  });

  it("walks every round: choose → see the result → continue → next scene → final report", async () => {
    const { api, calls } = fakeApi();
    localStorage.setItem(KEY, roundViews[0].simulation.id);
    render(<App api={api} />);
    await screen.findByRole("heading", { name: "THE SCREENS GO DARK" });
    for (let r = 0; r < 10; r++) {
      await userEvent.click(firstAvailable());
      await userEvent.click(screen.getByRole("button", { name: /Commit decision|Confirm decision/ }));
      const cont = await screen.findByRole("button", { name: /Continue to the next event|See the final reopening/ });
      expect(screen.getByRole("heading", { name: "You decided" })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Consequences" })).toBeInTheDocument();
      await userEvent.click(cont);
    }
    expect(await screen.findByRole("heading", { level: 1, name: "FULL RECOVERY" })).toBeInTheDocument();
    expect(calls.filter((c) => c.startsWith("decide:"))).toHaveLength(10);
    expect(screen.getByRole("meter", { name: "Urgent customers" })).toHaveAttribute("aria-valuenow", "220");
  }, 20_000);   // ten rounds of drawn comic pages in jsdom; the drawings made this slower than the old 5 s default allowed

  it("shows consequences/events returned by the server on the result screen", async () => {
    const withEvent = roundViews.slice(1).find((v) => v.outcome && v.outcome.events.length > 0)!;
    const idx = roundViews.slice(1).indexOf(withEvent);
    const { api } = fakeApi([...Array(idx).fill(roundViews[1]), withEvent]);
    localStorage.setItem(KEY, "x");
    render(<App api={api} />);
    await screen.findByRole("heading", { name: "THE SCREENS GO DARK" });
    for (let k = 0; k <= idx; k++) {
      await userEvent.click(firstAvailable());
      await userEvent.click(screen.getByRole("button", { name: /Commit decision|Confirm decision/ }));
      const cont = await screen.findByRole("button", { name: /Continue|See/ });
      if (k === idx) {
        expect(screen.getByRole("region", { name: "Consequences" })).toHaveTextContent(withEvent.outcome!.events[0].title);
      }
      await userEvent.click(cont);
    }
  });
});

describe("persistence and errors", () => {
  it("resumes the saved simulation after a refresh without creating a new one", async () => {
    const { api } = fakeApi(undefined, {}, roundViews[4]);
    localStorage.setItem(KEY, roundViews[4].simulation.id);
    render(<App api={api} />);
    expect(await screen.findByRole("heading", { name: roundViews[4].scene.title! })).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.get).toHaveBeenCalledWith(roundViews[4].simulation.id);
  });

  it("returns to the start screen with an explanation when the saved simulation no longer exists", async () => {
    const { api } = fakeApi([], { get: vi.fn(async () => { throw new ApiError("gone", 404, "not_found"); }) });
    localStorage.setItem(KEY, "missing");
    render(<App api={api} />);
    expect(await screen.findByText(/could not be found/)).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(screen.getByRole("button", { name: "Begin the simulation" })).toBeEnabled();
  });

  it("keeps the saved id on a network failure and offers a retry that works", async () => {
    let fail = true;
    const { api } = fakeApi([], { get: vi.fn(async () => { if (fail) throw new ApiError("Cannot reach the simulation server.", 0, "network", true); return roundViews[0]; }) });
    localStorage.setItem(KEY, "keep-me");
    render(<App api={api} />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Cannot reach the simulation server");
    expect(localStorage.getItem(KEY)).toBe("keep-me");
    fail = false;
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "THE SCREENS GO DARK" })).toBeInTheDocument();
  });

  it("shows a server rejection without changing what is on screen", async () => {
    const { api } = fakeApi([], { decide: vi.fn(async () => { throw new ApiError("Needs ₹6.0 lakh; only ₹1.0 lakh remains.", 422, "invalid_request"); }) });
    localStorage.setItem(KEY, "x");
    render(<App api={api} />);
    await screen.findByRole("heading", { name: "THE SCREENS GO DARK" });
    await choose(/Cut the affected/);
    expect(await screen.findByRole("alert")).toHaveTextContent("only ₹1.0 lakh remains");
    expect(screen.getByRole("heading", { name: "THE SCREENS GO DARK" })).toBeInTheDocument();      // still round 1
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a loading state while the server works and blocks double submission", async () => {
    let release!: (v: SimulationView) => void;
    const pending = new Promise<SimulationView>((r) => { release = r; });
    const { api } = fakeApi([], { decide: vi.fn(() => pending) });
    localStorage.setItem(KEY, "x");
    render(<App api={api} />);
    await screen.findByRole("heading", { name: "THE SCREENS GO DARK" });
    await userEvent.click(screen.getAllByRole("radio")[0]);
    await userEvent.click(screen.getByRole("button", { name: "Commit decision" }));
    expect((await screen.findAllByText("Applying decision…")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Commit decision" })).toBeNull();
    await act(async () => { release(roundViews[1]); });
    expect(await screen.findByRole("heading", { name: "You decided" })).toBeInTheDocument();
    expect(api.decide).toHaveBeenCalledTimes(1);
  });
});

describe("dead end and rewind", () => {
  const toDeadEnd = async (view: SimulationView) => {
    const { api, calls } = fakeApi([view]);
    localStorage.setItem(KEY, "x");
    render(<App api={api} />);
    await screen.findByRole("heading", { name: "THE SCREENS GO DARK" });
    await userEvent.click(screen.getAllByRole("radio")[0]);
    await userEvent.click(screen.getByRole("button", { name: "Commit decision" }));
    await userEvent.click(await screen.findByRole("button", { name: "See what happened" }));
    return { api, calls };
  };

  it("pauses on the dead-end screen with the analysis from the server", async () => {
    await toDeadEnd(deadEndHard);
    expect(await screen.findByRole("heading", { level: 1, name: "DEAD END — RECOVERY WINDOW CLOSED" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "REWIND TO LAST RECOVERABLE DECISION" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Continue despite the risk" })).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();                                           // no way to keep deciding
  });

  it("rewinds, explains what was known versus discovered later, then lets the player choose again", async () => {
    const { api, calls } = await toDeadEnd(deadEndHard);
    await userEvent.click(await screen.findByRole("button", { name: "REWIND TO LAST RECOVERABLE DECISION" }));
    expect(await screen.findByRole("heading", { name: "Back at the decision" })).toBeInTheDocument();
    expect(calls).toContain("rewind:undefined");
    expect(api.rewind).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("region", { name: "What you knew then" })).toBeInTheDocument();
    const later = screen.getByRole("region", { name: "Discovered later" });
    expect(later).toHaveTextContent("You could not have known these at the time");
    await userEvent.click(screen.getByRole("button", { name: "Choose differently" }));
    expect(await screen.findAllByRole("radio")).not.toHaveLength(0);
    expect(screen.getByText(/Attempt 2/)).toBeInTheDocument();
  });

  it("offers 'continue despite the risk' on a soft dead end and resumes play", async () => {
    const { api } = await toDeadEnd(deadEndSoft);
    await userEvent.click(await screen.findByRole("button", { name: "Continue despite the risk" }));
    await waitFor(() => expect(api.continueAnyway).toHaveBeenCalled());
    expect(await screen.findAllByRole("radio")).not.toHaveLength(0);
  });

  it("restarts the whole simulation from the dead-end screen", async () => {
    const { api } = await toDeadEnd(deadEndHard);
    await userEvent.click(await screen.findByRole("button", { name: "Restart entire simulation" }));
    expect(await screen.findByRole("heading", { name: "THE SCREENS GO DARK" })).toBeInTheDocument();
    expect(api.restart).toHaveBeenCalled();
  });
});

describe("pause and history", () => {
  it("pauses with a modal, hides the scene, and resumes on Escape", async () => {
    const { api } = fakeApi();
    localStorage.setItem(KEY, "x");
    render(<App api={api} />);
    await screen.findByRole("heading", { name: "THE SCREENS GO DARK" });
    await userEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("dialog", { name: "Simulation paused" })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).toBeNull();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("opens the event log with decisions, what was known, and events", async () => {
    const afterThree = roundViews[3];
    const { api } = fakeApi(undefined, {}, afterThree);
    localStorage.setItem(KEY, "x");
    render(<App api={api} />);
    await screen.findByRole("heading", { name: afterThree.scene.title! });
    await userEvent.click(screen.getByRole("button", { name: /Event log/ }));
    const log = await screen.findByRole("region", { name: "Event log" });
    expect(within(log).getAllByText("Decision:")).toHaveLength(3);
    expect(within(log).getAllByText("What you knew at the time").length).toBe(3);
    await userEvent.click(screen.getByRole("button", { name: "Back to the simulation" }));
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(0);
  });

  it("rewinds to a chosen earlier decision from the attempts view, with confirmation", async () => {
    const { api } = fakeApi(undefined, {}, roundViews[3]);
    localStorage.setItem(KEY, "x");
    render(<App api={api} />);
    await screen.findByRole("heading", { name: roundViews[3].scene.title! });
    await userEvent.click(screen.getByRole("button", { name: /Event log/ }));
    await userEvent.click(await screen.findByRole("tab", { name: "Attempts & timeline" }));
    await userEvent.click(await screen.findByRole("button", { name: /Rewind to decision 2:/ }));
    expect(api.rewind).not.toHaveBeenCalled();                                                // needs confirmation
    await userEvent.click(screen.getByRole("button", { name: "Yes, rewind" }));
    await waitFor(() => expect(api.rewind).toHaveBeenCalledWith(roundViews[3].simulation.id, 1));
    expect(await screen.findByRole("heading", { name: "Back at the decision" })).toBeInTheDocument();
  });

  it("completed runs offer both a what-if timeline and a rewind via the history", async () => {
    const { api } = fakeApi(undefined, {}, completedGood);
    localStorage.setItem(KEY, "x");
    render(<App api={api} />);
    expect(await screen.findByRole("heading", { level: 1, name: "FULL RECOVERY" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try a different decision" }));
    expect(await screen.findByRole("heading", { name: "Try a different decision" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await userEvent.click(await screen.findByRole("button", { name: "Rewind to an earlier decision" }));
    expect(await screen.findByRole("heading", { name: /Event log/ })).toBeInTheDocument();
  });
});

describe("gallery route", () => {
  it("is still reachable at #/gallery", async () => {
    window.location.hash = "#/gallery";
    render(<App api={fakeApi().api} />);
    expect(await screen.findByText(/renderer gallery/i)).toBeInTheDocument();
  });
});


describe("stakeholder advice", () => {
  const open = async (initial = roundViews[1], over: Partial<GameApi> = {}) => {
    const f = fakeApi(undefined, over, initial);
    localStorage.setItem(KEY, "x");
    render(<App api={f.api} />);
    await screen.findByRole("heading", { name: initial.scene.title! });
    return f;
  };

  it("lets the player ask a stakeholder, shows their view, and does not alter the world", async () => {
    const { api, calls } = await open();
    const hudBefore = screen.getByRole("meter", { name: "Recovery effort" }).getAttribute("aria-valuetext");
    await userEvent.click(screen.getByRole("button", { name: "Ask Terminal Supervisor for advice" }));
    const card = await screen.findByRole("article", { name: "Advice from Terminal Supervisor" });
    expect(card).toHaveTextContent("Clear the affected area");
    expect(within(card).getByText("Rule-based")).toBeInTheDocument();
    expect(within(card).getByRole("meter", { name: "Terminal Supervisor confidence" })).toBeInTheDocument();
    expect(calls).toContain("advice:kavya");
    expect(screen.getByRole("meter", { name: "Recovery effort" }).getAttribute("aria-valuetext")).toBe(hudBefore);
    expect(api.decide).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Ask Terminal Supervisor for advice" })).toBeNull();     // already asked
    expect(screen.getByText("Advice given — see below")).toBeInTheDocument();
  });

  it("marks each option with who recommends or opposes it, accessibly", async () => {
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Ask Terminal Supervisor for advice" }));
    await screen.findByRole("article", { name: "Advice from Terminal Supervisor" });
    const maintain = screen.getByRole("radio", { name: /Keep working manually/ });
    expect(within(maintain).getByText(/Terminal Supervisor/)).toBeInTheDocument();
    expect(within(maintain).getByText(/advises against this/)).toBeInTheDocument();
    const evacuate = screen.getByRole("radio", { name: /Clear the affected area/ });
    expect(within(evacuate).getByText(/recommends this/)).toBeInTheDocument();
  });

  it("shows several advisors, and they are allowed to disagree", async () => {
    await open();
    for (const who of ["Terminal Supervisor", "Operations Manager"]) await userEvent.click(screen.getByRole("button", { name: `Ask ${who} for advice` }));
    await screen.findByRole("article", { name: "Advice from Operations Manager" });
    const kavya = adviceSamples.find((a) => a.stakeholder === "kavya")!, nisha = adviceSamples.find((a) => a.stakeholder === "nisha")!;
    expect(kavya.recommendation).not.toBe(nisha.recommendation);
    expect(screen.getAllByRole("article", { name: /^Advice from/ })).toHaveLength(2);
  });

  it("warns when an advisor's own information is unverified", async () => {
    const f = await open(roundViews[3], { advice: vi.fn(async () => adviceUnverified) });
    await userEvent.click(screen.getByRole("button", { name: "Ask Network Administrator for advice" }));
    const card = await screen.findByRole("article", { name: "Advice from Network Administrator" });
    expect(within(card).getByRole("note")).toHaveTextContent("Unverified: check this before relying on it");
    expect(f.api.advice).toHaveBeenCalled();
  });

  it("restores advice already given after a refresh", async () => {
    const f = fakeApi(undefined, { adviceSoFar: vi.fn(async () => [adviceSamples[0], adviceSamples[2]]) }, roundViews[1]);
    localStorage.setItem(KEY, "x");
    render(<App api={f.api} />);
    expect(await screen.findByRole("article", { name: "Advice from Terminal Supervisor" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Advice from Operations Manager" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ask Terminal Supervisor for advice" })).toBeNull();
    expect(screen.getByRole("button", { name: "Ask IT Lead for advice" })).toBeEnabled();
  });

  it("reports a failed request without losing the scene and allows retrying", async () => {
    let fail = true;
    await open(roundViews[1], { advice: vi.fn(async (_i: string, who: StakeholderKey) => { if (fail) throw new ApiError("Cannot reach the simulation server.", 0, "network", true); return adviceSamples.find((a) => a.stakeholder === who)!; }) });
    await userEvent.click(screen.getByRole("button", { name: "Ask Terminal Supervisor for advice" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot reach");
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(0);
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Ask Terminal Supervisor for advice" }));
    expect(await screen.findByRole("article", { name: "Advice from Terminal Supervisor" })).toBeInTheDocument();
  });

  it("labels AI-phrased advice differently from rule-based advice", async () => {
    const llm: Advice = { ...adviceSamples[0], source: "llm" };
    await open(roundViews[1], { advice: vi.fn(async () => llm) });
    await userEvent.click(screen.getByRole("button", { name: "Ask Terminal Supervisor for advice" }));
    const card = await screen.findByRole("article", { name: "Advice from Terminal Supervisor" });
    expect(within(card).getByText("AI-phrased")).toHaveAttribute("title", expect.stringContaining("fixed rules"));
  });

  it("clears advice when the decision changes", async () => {
    const f = fakeApi(undefined, {}, roundViews[1]);
    localStorage.setItem(KEY, "x");
    render(<App api={f.api} />);
    await screen.findByRole("heading", { name: roundViews[1].scene.title! });
    await userEvent.click(screen.getByRole("button", { name: "Ask Terminal Supervisor for advice" }));
    await screen.findByRole("article", { name: "Advice from Terminal Supervisor" });
    f.given.clear();
    await userEvent.click(screen.getAllByRole("radio").find((r) => r.getAttribute("aria-disabled") !== "true")!);
    await userEvent.click(screen.getByRole("button", { name: /Commit decision|Confirm decision/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findAllByRole("radio");
    expect(screen.queryByRole("article", { name: /^Advice from/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Ask Terminal Supervisor for advice" })).toBeEnabled();
  });
});


describe("report, what-if and comparison flows", () => {
  const finished = async (over: Partial<GameApi> = {}) => {
    const f = fakeApi(undefined, over, completedGood);
    localStorage.setItem(KEY, "x");
    render(<App api={f.api} />);
    await screen.findByRole("heading", { level: 1, name: "FULL RECOVERY" });
    return f;
  };

  it("fetches and shows the scored report under the ending", async () => {
    const f = await finished();
    expect(await screen.findByRole("heading", { name: "Performance report" })).toBeInTheDocument();
    expect(f.api.report).toHaveBeenCalledWith(completedGood.simulation.id, completedGood.run.id);
    expect(screen.getByRole("img", { name: /Overall score/ })).toBeInTheDocument();
    expect(screen.getAllByRole("meter", { name: /Staff safety & risk management/ })).toHaveLength(1);
  });

  it("shows a loading state, and a clear message if the report fails (the ending still shows)", async () => {
    await finished({ report: vi.fn(async () => { throw new ApiError("Server error", 500, "internal_error"); }) });
    expect(await screen.findByRole("alert")).toHaveTextContent("The report could not be loaded: Server error");
    expect(screen.getByRole("heading", { level: 1, name: "FULL RECOVERY" })).toBeInTheDocument();
  });

  it("offers 'Compare attempts' only when more than one attempt exists", async () => {
    await finished();
    await screen.findByRole("heading", { name: "Performance report" });
    expect(screen.queryByRole("button", { name: "Compare attempts side by side" })).toBeNull();
  });

  it("opens the comparison when several attempts exist", async () => {
    const two = { ...reportGood, attempts: [reportGood.attempts[0], { ...reportGood.attempts[0], run_id: "other", attempt: 2, active: false, label: "Attempt 2" }] };
    const f = await finished({ report: vi.fn(async () => two) });
    await userEvent.click(await screen.findByRole("button", { name: "Compare attempts side by side" }));
    expect(await screen.findByRole("heading", { name: "Compare timelines" })).toBeInTheDocument();
    expect(f.api.compare).toHaveBeenCalledWith(completedGood.simulation.id);
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByRole("heading", { level: 1, name: "FULL RECOVERY" })).toBeInTheDocument();
  });

  it("runs the whole counterfactual flow: pick a decision, see what was known, pick another option, compare", async () => {
    const f = await finished();
    await userEvent.click(await screen.findByRole("button", { name: "Try a different decision" }));
    expect(await screen.findByRole("heading", { name: "Try a different decision" })).toBeInTheDocument();
    expect(screen.getByText(/same seed; your finished run stays exactly as it is/)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: /Change decision 10:/ }));
    expect(await screen.findByText("What you knew then")).toBeInTheDocument();
    expect(f.api.checkpoint).toHaveBeenCalledWith(completedGood.simulation.id, 9);
    const chosen = checkpointNine.choices.find((c) => c.chosen)!;
    expect(screen.getByText("What you chose")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Run the timeline where you chose: ${chosen.label}` })).toBeNull();
    const other = checkpointNine.choices.find((c) => !c.chosen && c.available)!;
    await userEvent.click(screen.getByRole("button", { name: `Run the timeline where you chose: ${other.label}` }));
    await waitFor(() => expect(f.api.replay).toHaveBeenCalledWith(completedGood.simulation.id, 9, [other.id], true));
    expect(await screen.findByRole("heading", { name: "Compare timelines" })).toBeInTheDocument();
    expect(f.calls.indexOf("replay")).toBeLessThan(f.calls.indexOf("compare"));
  });

  it("shows why an option cannot be tried and surfaces replay errors", async () => {
    const cp = { ...checkpointNine, choices: checkpointNine.choices.map((c, i) => (i === 2 ? { ...c, chosen: false, available: false, reason: "Not enough time slack left." } : { ...c, chosen: i === 0 })) };
    await finished({ checkpoint: vi.fn(async () => cp), replay: vi.fn(async () => { throw new ApiError("Run limit reached (30) for this simulation.", 409, "conflict"); }) });
    await userEvent.click(await screen.findByRole("button", { name: "Try a different decision" }));
    await userEvent.click(await screen.findByRole("button", { name: /Change decision 1:/ }));
    expect(await screen.findByText("Not enough time slack left.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Run the timeline where you chose/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Run limit reached");
  });
});
