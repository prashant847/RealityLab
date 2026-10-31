import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { ComicReader } from "./ComicReader";
import { FIRST_SURGE } from "./firstSurge";

describe("the first-surge comic", () => {
  it("has four pages, each with a description for screen readers and a line for read-aloud", () => {
    expect(FIRST_SURGE.map((p) => p.id)).toEqual(["morning", "waiting", "huddle", "question"]);
    for (const p of FIRST_SURGE) { expect(p.alt.length).toBeGreaterThan(40); expect(p.spoken.length).toBeGreaterThan(20); }
  });

  it("only says what the round says: 31 waiting, a mix of severities, changing guidance, an anxious and partly new team, the round's own question", () => {
    const all = FIRST_SURGE.map((p) => p.alt + " " + p.spoken).join(" ");
    for (const fact of ["Thirty-one", "faster than your team can assess them", "Guidance from health authorities is still changing", "anxious and some are new to this", "how you want to decide who is seen first"]) expect(all).toContain(fact);
  });

  it("is read a page at a time, from the keyboard or the buttons, and can be skipped", async () => {
    const done = vi.fn();
    const { container } = render(<ComicReader pages={FIRST_SURGE} title="The first surge" onDone={done} />);
    expect(screen.getByRole("group", { name: /Page 1 of 4/ })).toBeInTheDocument();
    expect(container.querySelector("svg.ck-page")).not.toBeNull();
    expect(screen.getByRole("button", { name: "← Back" })).toBeDisabled();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("group", { name: /Page 2 of 4/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next page →" }));
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("group", { name: /Page 2 of 4/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Page 4" }));
    expect(screen.getByRole("button", { name: "Make your decision →" })).toBeInTheDocument();
    expect(done).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Make your decision →" }));
    expect(done).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Skip the comic" }));
    expect(done).toHaveBeenCalledTimes(2);
  });

  it("uses a finished picture for a page when one has been added, keeps the live text on top, and falls back to the drawing otherwise", async () => {
    class Img { onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(v: string) { setTimeout(() => (v.endsWith("/first-surge/morning.png") ? this.onload?.() : this.onerror?.()), 0); } }
    vi.stubGlobal("Image", Img);
    const { container } = render(<ComicReader pages={FIRST_SURGE} dir="first-surge" title="The first surge" onDone={() => undefined} />);
    await waitFor(() => expect(container.querySelector("svg.ck-page image")?.getAttribute("href")).toBe("/comic/first-surge/morning.png"));
    expect(container.querySelector("svg.ck-page")!.textContent).toContain("Thirty-one waiting");     // the words are still live text
    await userEvent.keyboard("{ArrowRight}");
    expect(container.querySelector("svg.ck-page image")).toBeNull();                                  // page 2 has no picture: the drawn art
    vi.unstubAllGlobals();
  });
});
