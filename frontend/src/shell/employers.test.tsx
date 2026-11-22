import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShortlistItem, SimsApi } from "../api/sims";
import { Employers } from "./Employers";

const row = (over: Partial<ShortlistItem> = {}): ShortlistItem => ({ id: "s1", code: "RL-abcdef12-0a1b2c3d", candidate: "Asha Rao", simulation: "Appendicectomy", sim_id: "surgery", score: 92, band: "outstanding", band_label: "Outstanding",
  skills: [{ id: "judgement", label: "Judgement", percent: 90 }], note: "", added_at: "2026-11-23T09:00:00Z", ...over });
const me = { id: "e", email: "hr@acme.test", org: "Acme Hiring" };

describe("the employer shortlist", () => {
  beforeEach(() => { localStorage.clear(); });

  it("asks for a sign-in first, then shows the shortlist ranked with each competency", async () => {
    const api = { employerLogin: vi.fn().mockResolvedValue({ token: "tok", employer: me }), employerMe: vi.fn().mockResolvedValue(me), shortlist: vi.fn().mockResolvedValue([row(), row({ id: "s2", candidate: "Ben Cole", score: 61, band: "competent", band_label: "Competent", code: "RL-11111111-22222222" })]),
      analytics: vi.fn().mockResolvedValue({ sim_id: "surgery", attempts: 0, mean: null, distribution: [], steps: [] }) } as unknown as SimsApi;
    render(<Employers api={api} />);
    expect(screen.queryByLabelText("Add a candidate by their report code")).toBeNull();
    fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "hr@acme.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(api.employerLogin).toHaveBeenCalledWith("hr@acme.test", "correct horse"));
    expect(await screen.findByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Ben Cole")).toBeInTheDocument();
    expect(screen.getByText("Judgement")).toBeInTheDocument();
    expect(localStorage.getItem("rl.employerToken")).toBe("tok");
  });

  it("verifies a code before adding it and shows why a bad one is refused", async () => {
    localStorage.setItem("rl.employerToken", "tok");
    const addCandidate = vi.fn().mockRejectedValueOnce(new Error("This code does not match the report on record.")).mockResolvedValueOnce(row());
    const shortlist = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([row()]);
    const api = { employerMe: vi.fn().mockResolvedValue(me), shortlist, addCandidate, analytics: vi.fn() } as unknown as SimsApi;
    render(<Employers api={api} />);
    const input = await screen.findByLabelText("Add a candidate by their report code");
    fireEvent.change(input, { target: { value: "RL-abcdef12-00000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and add" }));
    expect(await screen.findByText(/does not match the report on record/)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "RL-abcdef12-0a1b2c3d" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and add" }));
    expect(await screen.findByText("Asha Rao")).toBeInTheDocument();
    expect(addCandidate).toHaveBeenCalledWith("tok", "RL-abcdef12-0a1b2c3d");
  });

  it("goes back to the sign-in when the session has expired", async () => {
    localStorage.setItem("rl.employerToken", "old");
    const err = Object.assign(new Error("Your sign-in has expired."), { status: 401 });
    const api = { employerMe: vi.fn().mockRejectedValue(err), shortlist: vi.fn().mockRejectedValue(err) } as unknown as SimsApi;
    render(<Employers api={api} />);
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(localStorage.getItem("rl.employerToken")).toBeNull();
  });
});
