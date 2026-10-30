import { fireEvent, render } from "@testing-library/react";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { roundViews } from "../../fixtures";
import { ART_KINDS, artManifest, validateArtManifest, type ArtManifest } from "./artManifest";
import { IllustratedPage } from "./IllustratedPage";
import { ART_SCENES } from "./scenes";

const ART = resolve(__dirname, "../../../public/assets/art");
const round1 = roundViews[0].scene;
import { legacyRound1Page } from "../../fixtures/legacyRound1";

describe("art manifest", () => {
  it("is valid and every listed file exists", () => {
    expect(validateArtManifest(artManifest, (p) => existsSync(join(ART, p)))).toEqual([]);
  });

  it("reports missing files, bad ids, bad formats and missing alt text", () => {
    const bad: ArtManifest = { version: 1, note: "", assets: {
      "Bad Id": { kind: "environment", path: "x.svg", width: 1, height: 1, status: "real", alt: "", brief: "" },
      "env.ok.one": { kind: "environment", path: "env/missing.png", width: 1, height: 1, status: "real", alt: "a", brief: "" },
    } };
    const problems = validateArtManifest(bad, () => false).join("|");
    expect(problems).toMatch(/dotted lowercase/);
    expect(problems).toMatch(/not a PNG or WebP/);
    expect(problems).toMatch(/missing alt/);
    expect(problems).toMatch(/file missing env\/missing\.png/);
  });

  it("only uses PNG/WebP; real assets carry a full credit record and placeholders carry none", () => {
    for (const [id, a] of Object.entries(artManifest.assets)) {
      expect(a.path, id).toMatch(/\.(png|webp)$/);
      expect(ART_KINDS).toContain(a.kind);
      if (a.status === "real") expect(a.credit, id).toBeDefined(); else expect(a.credit, id).toBeUndefined();
    }
  });

  it("refuses a 'real' asset without provenance, and credit on a placeholder", () => {
    const base = { kind: "environment", path: "env/x.png", width: 1, height: 1, alt: "a", brief: "b" } as const;
    const bad: ArtManifest = { version: 1, note: "", assets: {
      "env.a.one": { ...base, status: "real" },
      "env.a.two": { ...base, status: "real", fit: "f", credit: { title: "t", source: "http://x", original: "o", author: "", license: "CC0", licenseUrl: "https://l", attributionRequired: false, changes: "c" } },
      "env.a.three": { ...base, status: "placeholder", credit: { title: "t", source: "https://s", original: "o", author: "a", license: "CC0", licenseUrl: "https://l", attributionRequired: false, changes: "c" } },
    } };
    const p = validateArtManifest(bad).join("|");
    expect(p).toMatch(/env\.a\.one: real asset has no credit/);
    expect(p).toMatch(/env\.a\.two: credit\.author is empty/);
    expect(p).toMatch(/env\.a\.two: credit source and licenseUrl must be https/);
    expect(p).toMatch(/env\.a\.three: only real assets may carry a credit/);
  });

  it("is honest about the faceless stand-ins: they are photographs that say they are not the characters", () => {
    for (const id of ["env.arjun.hands_keyboard", "env.director.skyline_silhouette"]) {
      const a = artManifest.assets[id];
      expect(a.status, id).toBe("real");
      expect(a.fit, id).toMatch(/not (Arjun|the director)/i);
      expect(a.credit?.license, id).toBe("CC0");
      expect(a.kind, id).not.toBe("character");
    }
    expect(Object.keys(artManifest.assets).filter((k) => k.startsWith("char."))).toEqual([]);   // no character art exists yet, so none is claimed
  });

  it("contains no SVG people: the art directory holds only PNG/WebP and the manifest", () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    for (const f of walk(ART)) expect(f).toMatch(/\.(png|webp|json)$/);
  });
});

describe("opening scene script", () => {
  const script = ART_SCENES[1];
  it("only references assets in the manifest and panels in the backend page", () => {
    const sourceIds = legacyRound1Page!.panels.map((p) => p.id);
    for (const p of script.panels) {
      for (const l of p.layers) expect(artManifest.assets[l.asset], l.asset).toBeDefined();
      if (p.source) expect(sourceIds).toContain(p.source);
    }
    expect(artManifest.assets[script.decisionBackdrop]).toBeDefined();
  });

  it("has the opening beats: wide, Arjun at the system, evidence, the director's reaction (then the decision panel), with no face layers", () => {
    expect(script.panels.map((p) => p.id)).toEqual(["wide", "arjun", "evidence", "director"]);
    const roles = script.panels.flatMap((p) => p.layers.map((l) => l.role));
    expect(roles).toEqual(expect.arrayContaining(["background", "foreground"]));
    expect(roles).not.toContain("character");
  });
});

describe("IllustratedPage", () => {
  const script = ART_SCENES[1];
  it("renders image layers (not drawn figures) with the backend's own narration and dialogue", () => {
    const { container } = render(<IllustratedPage page={legacyRound1Page} script={script} title={round1.title} />);
    expect(container.querySelectorAll("figure.panel")).toHaveLength(4);
    expect(container.querySelectorAll("img[data-art]").length).toBe(script.panels.flatMap((p) => p.layers).length);
    expect(container.querySelector("svg.figure")).toBeNull();
    for (const p of legacyRound1Page!.panels) for (const d of p.dialogue) expect(container).toHaveTextContent(d.text);
    expect(container).toHaveTextContent(legacyRound1Page!.panels[0].narration!);
  });

  it("tags only panels that still contain placeholder art (none remain on this page)", () => {
    const { container } = render(<IllustratedPage page={legacyRound1Page} script={script} />);
    const tagged = [...container.querySelectorAll("figure[data-art-panel]")].filter((f) => f.querySelector(".art-tag")).map((f) => f.getAttribute("data-panel"));
    expect(tagged).toEqual([]);
    const { container: c2 } = render(<IllustratedPage page={legacyRound1Page} script={{ ...script, panels: [{ id: "x", ratio: 2, layers: [{ asset: "char.arjun.concern_closeup", role: "character" }, ...script.panels[0].layers] }] }} />);
    expect(c2.querySelector('[data-art-status="missing"]')).not.toBeNull();   // an unknown asset still fails loudly
  });

  it("credits every real image with author and licence links", () => {
    const { container } = render(<IllustratedPage page={legacyRound1Page} script={script} />);
    const credits = container.querySelector(".art-credits")!;
    expect(credits).toHaveTextContent("Kari Hakli");
    expect(credits).toHaveTextContent("CC BY 4.0");
    expect(credits.querySelectorAll("li")).toHaveLength(6);
    expect(credits.querySelector('a[href^="https://creativecommons.org/licenses/by/4.0"]')).not.toBeNull();
  });

  it("shows a visible MISSING box when an image fails to load, and for unknown ids", () => {
    const { container } = render(<IllustratedPage page={legacyRound1Page} script={{ ...script, panels: [{ id: "x", ratio: 2, layers: [{ asset: "env.nope.nothing", role: "background" }, script.panels[0].layers[0]] }] }} />);
    expect(container.querySelector('[data-art-status="missing"]')).toHaveTextContent("env.nope.nothing");
    fireEvent.error(container.querySelector("img[data-art]")!);
    expect(container.querySelectorAll('[data-art-status="missing"]')).toHaveLength(2);
  });

  it("never invents text: a panel without a backend source shows none", () => {
    const { container } = render(<IllustratedPage page={legacyRound1Page} script={script} />);
    const director = container.querySelector('[data-panel="director"]')!;
    expect(director.querySelector(".bubble, .narration")).toBeNull();
  });
});

describe("source safety", () => {
  it("does not draw characters in the illustrated pipeline", () => {
    const dir = resolve(__dirname);
    for (const f of readdirSync(dir).filter((n) => /\.(ts|tsx)$/.test(n) && !n.endsWith(".test.tsx"))) {
      expect(readFileSync(join(dir, f), "utf8"), f).not.toMatch(/from "\.\.\/art\/(Figure|poses|looks)"/);
    }
  });
});
