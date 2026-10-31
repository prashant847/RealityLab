import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { ComicReader } from "./ComicReader";
import { GraphicPage, toComicPages, useIllustrated } from "./graphic";
import { ROUND1_PANELS } from "./round1";
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

describe("COVID Round 1 illustrated sequence", () => {
  it("has five panels whose words are the round's own, with the pictures as separate static files", () => {
    expect(ROUND1_PANELS.map((p) => p.src)).toEqual([1, 2, 3, 4, 5].map((n) => `/comic/round1/p${n}.jpg`));
    const words = ROUND1_PANELS.flatMap((p) => [...(p.narration ?? []).flatMap((n) => n.lines), ...(p.speech ?? []).flatMap((x) => x.lines)]).join(" ").replace(/\s+/g, " ");
    for (const fact of ["Day three, 07:30", "Overnight, admissions doubled", "Thirty-one people are waiting", "mix of mild and", "severe breathing difficulty", "Guidance from health authorities is still", "anxious and some", "are new to this", "Patients are arriving faster than your", "team can assess them", "Tell me how you want to decide", "who is seen first"]) expect(words).toContain(fact);
    for (const p of ROUND1_PANELS) { expect(p.alt.length).toBeGreaterThan(60); expect(p.spoken.length).toBeGreaterThan(20); }
  });

  it("draws the words as live text over the picture, never inside it", () => {
    const { container } = render(<GraphicPage p={ROUND1_PANELS[4]} />);
    const svg = container.querySelector("svg.ck-page")!;
    expect(svg.querySelector("image")!.getAttribute("href")).toBe("/comic/round1/p5.jpg");
    expect(svg.textContent).toContain("Thirty-one in the department.");
    expect(svg.textContent).toContain("How do you organise who is seen first?");
  });

  it("uses the illustrated pages only when every picture is really there, and otherwise falls back", async () => {
    const ok = { ok: true, headers: { get: () => "image/jpeg" } };
    vi.stubGlobal("fetch", vi.fn(async () => ok));
    const yes = renderHook(() => useIllustrated(ROUND1_PANELS));
    expect(yes.result.current).toBe("pending");
    await waitFor(() => expect(yes.result.current).toBe("yes"));
    vi.stubGlobal("fetch", vi.fn(async (u: string) => (u.endsWith("p3.jpg") ? { ok: false, headers: { get: () => "application/json" } } : ok)));
    const no = renderHook(() => useIllustrated(ROUND1_PANELS));
    await waitFor(() => expect(no.result.current).toBe("no"));
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, headers: { get: () => "text/html" } })));     // a server that answers every path with the app's page
    const html = renderHook(() => useIllustrated(ROUND1_PANELS));
    await waitFor(() => expect(html.result.current).toBe("no"));
    vi.unstubAllGlobals();
    expect(toComicPages(ROUND1_PANELS)).toHaveLength(5);
  });
});
