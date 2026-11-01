import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ComicReader } from "./ComicReader";
import { ROUND1_STORY } from "./round1Story";

describe("the comic reader", () => {
  it("is read a page at a time, from the keyboard or the buttons, and can be skipped", async () => {
    const done = vi.fn();
    render(<ComicReader pages={ROUND1_STORY} title="The first surge" onDone={done} />);
    expect(screen.getByRole("group", { name: /Page 1 of 3/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← Back" })).toBeDisabled();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("group", { name: /Page 2 of 3/ })).toBeInTheDocument();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("group", { name: /Page 1 of 3/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Page 3" }));
    await userEvent.click(screen.getByRole("button", { name: "Make your decision →" }));
    expect(done).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Skip the comic" }));
    expect(done).toHaveBeenCalledTimes(2);
  });
});

describe("COVID Round 1 comic", () => {
  it("is three multi-panel pages whose words are the round's own", () => {
    expect(ROUND1_STORY.map((p) => p.id)).toEqual(["page1", "page2", "page3"]);
    for (const p of ROUND1_STORY) { expect(p.alt.length).toBeGreaterThan(60); expect(p.spoken.length).toBeGreaterThan(20); }
    const { container } = render(<>{ROUND1_STORY.map((p) => <div key={p.id}>{p.render()}</div>)}</>);
    const text = container.textContent!.replace(/\s+/g, " ");
    for (const fact of ["Day three, 07:30.", "Overnight, admissions doubled.", "Thirty-one people are waiting", "emergency department.", "A mix of mild and severe", "breathing difficulty.", "Patients are arriving faster", "than your team can assess them.", "Guidance from health authorities", "is still changing.", "Your team is anxious and some", "are new to this.", "Thirty-one in the department.", "Tell me how you want", "seen first.", "How do you organise who is seen first?"]) expect(text).toContain(fact);
    expect(container.querySelectorAll("svg")).toHaveLength(0);                                         // no drawn SVG art any more
    expect(container.querySelectorAll(".cm-panel > img")).toHaveLength(11);                            // eleven inked panels
  });
});
