import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { roundViews } from "../../fixtures";
import { IllustratedPage } from "../illustrated/IllustratedPage";
import { ART_SCENES_FLAT, ART_SCENES_VECTOR, FIRST_PAGE_STYLE, activeScenes } from "../illustrated/scenes";
import { Terminal, evidenceRows } from "./Terminal";
import { VECTOR_SCENES, VectorScene } from "./VectorScene";

const round1 = roundViews[0].scene;
const facts = round1.info ?? [];

describe("evidence is understandable and uses only the scene's own words", () => {
  it("turns the opening facts into plain rows with a clear status", () => {
    const rows = evidenceRows(facts);
    expect(rows.map((r) => `${r.title}: ${r.status}`)).toEqual([
      "Inventory dashboard: OFFLINE", "Barcode scanners: NOT RESPONDING", "Access logs: UNUSUAL",
    ]);
    expect(rows[0].severity).toBe("failed");
    expect(rows[2].severity).toBe("warning");
    expect(rows[2].detail).toMatch(/authentication attempts appear in the access logs\. Cause unknown/);
  });

  it("never turns money or other facts into system evidence, and invents nothing", () => {
    expect(evidenceRows(["Emergency response budget: ₹12.0 lakh. Every action costs time."])).toEqual([]);
    expect(evidenceRows([])).toEqual([]);
    expect(evidenceRows(["Everything looks fine."])).toEqual([]);
  });

  it("renders readable text, not noise, and has an accessible description", () => {
    const { container } = render(<Terminal facts={facts} />);
    const text = container.textContent!;
    for (const w of ["Inventory dashboard", "OFFLINE", "Barcode scanners", "NOT RESPONDING", "Access logs", "UNUSUAL", "Cause unknown"]) expect(text).toContain(w);
    expect(container.querySelector("svg")).toHaveAttribute("aria-label", expect.stringContaining("Inventory dashboard: OFFLINE"));
  });
});

describe("vector first page", () => {
  it("the flat reference-style page is the active one; the earlier vector page stays available", () => {
    expect(FIRST_PAGE_STYLE).toBe("flat");
    expect(activeScenes()).toBe(ART_SCENES_FLAT);
    expect(ART_SCENES_VECTOR[1]).toBeDefined();
  });

  it("the earlier vector page has no photographs or placeholder tags", () => {
    const { container } = render(<IllustratedPage page={round1.page} script={ART_SCENES_VECTOR[1]} facts={facts} />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelector(".art-tag")).toBeNull();
    expect(container.querySelector(".art-credits")).toBeNull();
    expect(container.querySelectorAll("figure.panel--art")).toHaveLength(4);
    for (const p of round1.page!.panels) for (const d of p.dialogue) expect(container).toHaveTextContent(d.text);
  });

  it("draws every environment, and the story script uses all four", () => {
    for (const s of VECTOR_SCENES) { const { container, unmount } = render(<VectorScene scene={s} facts={facts} />); expect(container.querySelector("svg path, svg polygon, svg rect")).not.toBeNull(); unmount(); }
    const used = ART_SCENES_VECTOR[1].panels.flatMap((p) => p.layers.map((l) => l.vector)).filter(Boolean);
    expect(new Set(used)).toEqual(new Set(VECTOR_SCENES));
  });

  it("keeps the evidence inspection: the dialog shows the large terminal and the known facts", () => {
    render(<IllustratedPage page={round1.page} script={ART_SCENES_VECTOR[1]} facts={facts} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect evidence" }));
    const dialog = screen.getByRole("dialog", { name: "Inspect the evidence" });
    expect(dialog.querySelector("svg.vscene")).not.toBeNull();
    for (const f of facts) expect(dialog).toHaveTextContent(f);
  });
});

describe("flat reference-style first page", () => {
  const script = ART_SCENES_FLAT[1];
  it("is flat: no photographs, no placeholder tags, no credits, full-body people and the same story text", () => {
    const { container } = render(<IllustratedPage page={round1.page} script={script} facts={facts} />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelector(".art-tag, .art-credits")).toBeNull();
    expect(container.querySelector(".comic-page--art")).toHaveAttribute("data-grade", "flat");
    expect(container.querySelectorAll(".art--person").length).toBeGreaterThanOrEqual(4);
    for (const p of round1.page!.panels) for (const d of p.dialogue) expect(container).toHaveTextContent(d.text);
  });

  it("uses both story characters with different poses and keeps the readable evidence terminal", () => {
    const who = script.panels.flatMap((p) => p.layers.map((l) => l.person?.who)).filter(Boolean);
    expect(who).toEqual(expect.arrayContaining(["arjun", "director", "worker"]));
    const { container } = render(<IllustratedPage page={round1.page} script={script} facts={facts} />);
    expect(container.querySelector('[data-who="arjun"]')).toHaveAttribute("data-pose", "at_desk");
    expect(container.querySelector('[data-who="director"]')).toHaveAttribute("data-pose", "hand_chin");
    expect(container.querySelector('[data-panel="evidence"]')).toHaveTextContent("NOT RESPONDING");
  });
});
