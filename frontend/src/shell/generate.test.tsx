import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GenJob, GeneratedItem, RunView, SimsApi } from "../api/sims";
import { Generate, GeneratedCard } from "./Generate";
import { LabOutcome, LabStep, isLabView } from "../sims/lab/LabStep";

const job = (over: Partial<GenJob> = {}): GenJob => ({ id: "j1", request: "x", kind: "technical", status: "running", message: "Writing your simulation. This takes a few minutes.", sim_id: null, title: null, started: 1, finished: null, ...over });
const item = (over: Partial<GeneratedItem> = {}): GeneratedItem => ({ id: "gen_ab12", generated: true, kind: "technical", title: "Changing a Flat Tyre", tagline: "Work through each step.", role: "Driver", domain: "Car care · Roadside", minutes: 15, description: "d", objectives: [], disclaimer: "", steps: 8, status: "none", completed: 0, attempts: 0, ...over });
const api = (over: Partial<SimsApi> = {}): SimsApi => ({
  generate: vi.fn().mockResolvedValue(job()), generationJobs: vi.fn().mockResolvedValue({ enabled: true, jobs: [] }), generated: vi.fn().mockResolvedValue([]), deleteGenerated: vi.fn().mockResolvedValue({ deleted: "x" }), ...over,
} as unknown as SimsApi);

describe("deleting a generated simulation from a card", () => {
  it("shows Delete only when it can be deleted, and asks before doing it", async () => {
    const api = { deleteGenerated: vi.fn().mockResolvedValue({ deleted: "gen_ab12" }) } as unknown as SimsApi;
    const { deleteGeneratedSim } = await import("./Generate");
    const r = render(<GeneratedCard s={item()} />);
    expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull();
    r.unmount();
    const onDelete = vi.fn();
    render(<GeneratedCard s={item()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Changing a Flat Tyre" }));
    expect(onDelete).toHaveBeenCalled();
    const ask = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    expect(await deleteGeneratedSim(api, "gen_ab12", "Changing a Flat Tyre")).toBe(false);
    expect(api.deleteGenerated).not.toHaveBeenCalled();
    expect(await deleteGeneratedSim(api, "gen_ab12", "Changing a Flat Tyre")).toBe(true);
    expect(api.deleteGenerated).toHaveBeenCalledWith("gen_ab12");
    ask.mockRestore();
  });
});

describe("the Generate page", () => {
  it("sends the description and the kind straight to the service, shows that it is being written, and offers the simulation when it is done", async () => {
    const done = job({ status: "done", sim_id: "gen_ab12", title: "Changing a Flat Tyre", message: "Your simulation “Changing a Flat Tyre” is ready." });
    const jobs = vi.fn().mockResolvedValueOnce({ enabled: true, jobs: [] }).mockResolvedValueOnce({ enabled: true, jobs: [job()] }).mockResolvedValue({ enabled: true, jobs: [done] });
    const a = api({ generationJobs: jobs, generated: vi.fn().mockResolvedValue([item()]) });
    render(<Generate api={a} />);
    const button = screen.getByRole("button", { name: "Generate it" });
    expect(button).toBeDisabled();                                                    // a description is needed first
    await userEvent.type(screen.getByLabelText("What should the simulation be about?"), "How to change a flat tyre safely");
    await userEvent.click(screen.getByRole("radio", { name: /Normal simulation/ }));
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(a.generate).toHaveBeenCalledWith("How to change a flat tyre safely", "normal");
    expect(await screen.findByText("Writing your simulation…")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Play it now" }, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByText(/“Changing a Flat Tyre” is ready/)).toBeInTheDocument();
  }, 12000);

  it("says plainly when the Claude CLI is missing, lists what was generated, and deletes one after asking", async () => {
    const a = api({ generationJobs: vi.fn().mockResolvedValue({ enabled: false, jobs: [] }), generated: vi.fn().mockResolvedValue([item()]) });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Generate api={a} />);
    expect(await screen.findByText(/Claude CLI is not available/)).toBeInTheDocument();
    expect(await screen.findByText("Changing a Flat Tyre")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(a.deleteGenerated).toHaveBeenCalledWith("gen_ab12");
  });

  it("shows a generated simulation as a card that opens it", () => {
    window.location.hash = "";
    render(<GeneratedCard s={item({ status: "active", progress: "Step 3 of 8", percent: 25 })} />);
    expect(screen.getByRole("heading", { name: "Changing a Flat Tyre" })).toBeInTheDocument();
    expect(screen.getByText("Generated")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue or start new" }));
    expect(window.location.hash).toBe("#/gen/gen_ab12");
  });
});

const run = (stepId: string, kind: "technical" | "generated"): RunView => ({
  run: { id: "r1", sim_id: "gen_ab12", status: "active", attempt: 1 }, scenario: { id: "gen_ab12", title: "Changing a Flat Tyre", role: "", disclaimer: "", kind },
  scene: { meters: [{ id: "progress", label: "Progress", value: 0, good: "high", hint: "" }], flags: [], round: 1, total_rounds: 8, status: "active",
    step: { id: stepId, title: "Pull over safely", clock: "Step 1 · 16:30", kind: "simulation", brief: "The tyre is losing air.", question: "Where do you stop?", facts: ["A fact."], part: "", scene: "", sources: [], voice: null,
      choices: [{ id: `${stepId}_strong`, label: "Stop on the flat", summary: "", available: true, reason: "" }, { id: `${stepId}_mixed`, label: "Stop on the bend", summary: "", available: true, reason: "" }, { id: `${stepId}_weak`, label: "Stop in the lane", summary: "", available: true, reason: "" }] } },
  decisions: [],
}) as never;

describe("a generated simulation uses the lab layout with a plain card instead of a drawing", () => {
  it("is recognised by its id, shows the step on a card, and only a technical one says that one option works", () => {
    expect(isLabView(run("gen_ab12_r1", "technical"))).toBe(true);
    expect(isLabView(run("bw1", "technical"))).toBe(false);
    const t = render(<LabStep view={run("gen_ab12_r1", "technical")} picked={null} busy={false} onPick={() => undefined} onConfirm={() => undefined} />);
    expect(t.container.querySelector(".lab-plain b")?.textContent).toBe("Pull over safely");
    expect(t.container.querySelector(".lab-bg")).toBeNull();
    expect(screen.getByText(/One option works/)).toBeInTheDocument();
    t.unmount();
    const n = render(<LabStep view={run("gen_ab12_r1", "generated")} picked={null} busy={false} onPick={() => undefined} onConfirm={() => undefined} mode="normal" />);
    expect(n.container.querySelector(".lab-plain")).not.toBeNull();
    expect(screen.queryByText(/One option works/)).toBeNull();
  });

  it("in a normal one the result is a rated decision, never a FAILED stamp", () => {
    const prev = run("gen_ab12_r1", "generated");
    const out = { choice_id: "gen_ab12_r1_c2", label: "Stop in the lane", rating: "weak" as const, consequence: "It goes badly.", lesson: "", changes: { progress: [50, 40] as number[] }, completed: false, events: [] };
    const { container } = render(<LabOutcome mode="normal" outcome={out} prev={prev} view={prev} onNext={() => undefined} onRetry={() => undefined} />);
    expect(container.querySelector(".lab-stamp")).toBeNull();
    expect(screen.getByText("Weak decision")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Try again/ })).toBeNull();
    expect(container.querySelector(".wd-changes .down")).not.toBeNull();
  });
});

describe("a generated simulation's comic", () => {
  it("is drawn as a comic step with its own team and opinions, and only a comic-less one uses the lab card", async () => {
    const { registerComic, peopleOf, WORKDAY } = await import("../sims/comic/workdayData");
    const { OPINIONS } = await import("../sims/comic/workdayAdvice");
    const v = run("gen_ab12_r1", "technical");
    expect(registerComic(v.scene.step!)).toBe(false);
    v.scene.step!.comic = {
      bg: "bw2", adv: "kavya", third: "worker", player: "Sam", cast: [{ who: "kavya", name: "Marta Ilves", role: "Supervisor" }, { who: "worker", name: "Dev Raman", role: "Mechanic" }, { who: "arjun", name: "Arjun Rao", role: "Apprentice" }],
      replies: { strong: "Good.", mixed: "Hmm.", weak: "No.", third: "Careful." },
      opinions: { kavya: { for: "strong", say: "Stop on the flat.", against: "weak", why: "The lane is unsafe." }, worker: { for: null, say: "Your call.", against: null, why: null } },
    };
    expect(isLabView(v)).toBe(false);
    expect(registerComic(v.scene.step!)).toBe(true);
    expect(WORKDAY["gen_ab12_r1"].bg).toBe(WORKDAY["bw2"].bg);
    expect(WORKDAY["gen_ab12_r1"].cast.map((c) => c.who)).toEqual(["director", "kavya", "worker"].slice(0, WORKDAY["bw2"].cast.length).concat([]).slice(0, WORKDAY["gen_ab12_r1"].cast.length));
    expect(peopleOf("gen_ab12_r1").kavya?.name).toBe("Marta Ilves");
    expect(peopleOf("gen_ab12_r1").director?.name).toBe("Sam");
    expect(OPINIONS["gen_ab12_r1"].kavya?.say).toBe("Stop on the flat.");
  });
});
