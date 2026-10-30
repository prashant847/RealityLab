import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { roundViews } from "../../fixtures";
import { FailedSystemScreen, SCREEN_H, SCREEN_W, screenLines } from "./FailedSystemScreen";
import { homographyMatrix3d, mapPoint } from "./homography";
import { IllustratedPage } from "./IllustratedPage";
import { ART_SCENES } from "./scenes";

const round1 = roundViews[0].scene;

describe("homography", () => {
  it("maps the rectangle's corners onto the four photo points", () => {
    const quad: [[number, number], [number, number], [number, number], [number, number]] = [[10, 0], [515, 0], [560, 427], [173, 667]];
    const m = homographyMatrix3d(SCREEN_W, SCREEN_H, quad);
    const corners: [number, number][] = [[0, 0], [SCREEN_W, 0], [SCREEN_W, SCREEN_H], [0, SCREEN_H]];
    corners.forEach(([x, y], i) => {
      const [u, v] = mapPoint(m, x, y);
      expect(u).toBeCloseTo(quad[i][0], 1);
      expect(v).toBeCloseTo(quad[i][1], 1);
    });
  });
});

describe("failed system screen", () => {
  it("takes its words from the scene's own known facts and invents none", () => {
    const lines = screenLines(["Inventory dashboard offline; barcode scanners are not responding.", "Arjun: unusual authentication attempts appear in the access logs. Cause unknown.", "Emergency response budget: ₹12.0 lakh. Every action costs time before the 6:00 AM dispatch."]);
    expect(lines.join(" ")).toMatch(/Inventory dashboard offline/);
    expect(lines.join(" ")).toMatch(/barcode scanners are not responding/);
    const { container } = render(<FailedSystemScreen facts={["Inventory dashboard offline; barcode scanners are not responding.", "Arjun: unusual authentication attempts appear in the access logs. Cause unknown.", "Emergency response budget: ₹12.0 lakh. Every action costs time before the 6:00 AM dispatch."]} />);
    for (const l of lines) expect(container).toHaveTextContent(l);
    expect(container.textContent!.length).toBeLessThan((round1.info ?? [""])[0].length + 40);     // nothing beyond the fact, plus the "!" mark
  });

  it("shows no words at all when there are no facts, and uses no SVG or image", () => {
    const { container } = render(<FailedSystemScreen facts={[]} />);
    expect(container.textContent!.replace("!", "").trim()).toBe("");
    expect(container.querySelector("svg, img, canvas")).toBeNull();
  });

  it("sits on the Arjun panel's background and is hidden from assistive technology", () => {
    const { container } = render(<IllustratedPage page={round1.page} script={ART_SCENES[1]} facts={["Inventory dashboard offline; barcode scanners are not responding.", "Arjun: unusual authentication attempts appear in the access logs. Cause unknown.", "Emergency response budget: ₹12.0 lakh. Every action costs time before the 6:00 AM dispatch."]} />);
    const arjun = container.querySelector('[data-panel="arjun"]')!;
    const overlay = arjun.querySelector(".art--overlay")!;
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(overlay.querySelector(".fs")).not.toBeNull();
    expect(container.querySelectorAll(".art--overlay")).toHaveLength(1);                 // only this panel has one
    expect(container.querySelector(".comic-page--art")).toHaveAttribute("data-grade", "cinematic");
  });
});
