import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { roundViews } from "../../fixtures";
import { IllustratedPage } from "./IllustratedPage";
import { ART_SCENES } from "./scenes";

const round1 = roundViews[0].scene;
const script = ART_SCENES[1];

describe("interactive illustrated page", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows every panel straight away where IntersectionObserver is unavailable (and for assistive tech)", () => {
    const { container } = render(<IllustratedPage page={round1.page} script={script} />);
    expect([...container.querySelectorAll("figure.panel--art")].every((f) => f.classList.contains("is-seen"))).toBe(true);
  });

  it("reveals panels only when they scroll into view", () => {
    let callback: IntersectionObserverCallback = () => undefined;
    const observed: Element[] = [];
    vi.stubGlobal("IntersectionObserver", class { constructor(cb: IntersectionObserverCallback) { callback = cb; } observe(el: Element) { observed.push(el); } disconnect() { /* nothing */ } });
    const { container } = render(<IllustratedPage page={round1.page} script={script} />);
    const panels = [...container.querySelectorAll("figure.panel--art")];
    expect(panels.some((f) => f.classList.contains("is-seen"))).toBe(false);
    fireEvent.scroll(window);
    callback([{ isIntersecting: true, target: panels[0] } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(observed.length).toBe(panels.length);
  });

  it("offers Inspect only on the evidence panel, and shows the scene's own known facts in it", () => {
    const facts = round1.info ?? [];
    expect(facts.length).toBeGreaterThan(0);
    render(<IllustratedPage page={round1.page} script={script} facts={facts} />);
    const buttons = screen.getAllByRole("button", { name: "Inspect evidence" });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    const dialog = screen.getByRole("dialog", { name: "Inspect the evidence" });
    for (const f of facts) expect(dialog).toHaveTextContent(f);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("varies the page layout: wide strips plus unequal columns", () => {
    expect(script.columns).toMatch(/^\d+fr \d+fr$/);
    expect(script.columns.split(" ")[0]).not.toBe(script.columns.split(" ")[1]);
    expect(script.panels.filter((p) => p.span === 2).length).toBeGreaterThanOrEqual(2);
    expect(new Set(script.panels.map((p) => p.ratio)).size).toBeGreaterThanOrEqual(3);
  });
});
