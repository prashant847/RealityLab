import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SimReport, SimsApi } from "../api/sims";
import { ProReport } from "../sims/ProReport";
import { Verify } from "./Verify";

const rep = (over: Partial<SimReport> = {}): SimReport => ({
  simulation: "Appendicectomy", simulation_id: "surgery", role: "Surgeon", run_id: "abcdef1234567890", completed_at: "2026-01-05T10:00:00Z",
  outcome: { id: "success", title: "Operation complete", text: "Done.", tone: "good" }, final_meters: [], skills: [], challenges: [], lessons: [], improve: [],
  summary: { decisions: 2, strong: 2, mixed: 0, weak: 0 }, major_decisions: [], recommended_next: {}, note: "n",
  ...over,
} as unknown as SimReport);

describe("sealing a report", () => {
  it("offers a seal, shows the code once sealed, and needs a name first", async () => {
    const sealReport = vi.fn().mockResolvedValue({ code: "RL-abcdef12-0a1b2c3d", candidate: "Asha", issued_at: "2026-01-05T10:00:00Z" });
    const api = { sealReport } as unknown as SimsApi;
    const r = render(<ProReport api={api} rep={rep()} name="Candidate" onOpen={() => undefined} />);
    expect(screen.queryByRole("button", { name: /Seal this report/ })).toBeNull();
    expect(screen.getByText(/Add your name in Settings first/)).toBeInTheDocument();
    r.unmount();
    render(<ProReport api={api} rep={rep()} name="Asha" onOpen={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Seal this report as Asha" }));
    await waitFor(() => expect(sealReport).toHaveBeenCalledWith("abcdef1234567890", "Asha"));
    expect((await screen.findAllByText("RL-abcdef12-0a1b2c3d")).length).toBeGreaterThan(0);
  });
});

describe("the Verify page", () => {
  it("says a report is genuine, or not verified", async () => {
    const verifyReport = vi.fn().mockResolvedValueOnce({ valid: true, candidate: "Asha", issued_at: "2026-01-05T10:00:00Z", code: "RL-abcdef12-0a1b2c3d", report: rep(), score: 100, band: "outstanding", band_label: "Outstanding", benchmark: { n: 8, percentile: 75, mean: 60 } })
      .mockResolvedValueOnce({ valid: false, reason: "This code does not match the report on record." });
    const api = { verifyReport } as unknown as SimsApi;
    render(<Verify api={api} initial="" />);
    fireEvent.change(screen.getByLabelText("Report code"), { target: { value: "RL-abcdef12-0a1b2c3d" } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Genuine report")).toBeInTheDocument();
    expect(screen.getByText("Asha")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Report code"), { target: { value: "RL-abcdef12-00000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Not verified")).toBeInTheDocument();
    expect(screen.getByText(/does not match the report on record/)).toBeInTheDocument();
  });
});
