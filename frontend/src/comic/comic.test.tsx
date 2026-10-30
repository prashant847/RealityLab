import { fireEvent, render, screen, within } from "@testing-library/react";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { roundViews } from "../fixtures";
import { manifest } from "./assets";
import { ComicPage } from "./ComicPage";
import { ComicPanel } from "./ComicPanel";
import { planShot, type ShotPlan } from "./art/shots";
import { EFFECT_COMPONENTS } from "./EffectOverlay";
import { CHARACTER_IDS, EFFECT_IDS, ENVIRONMENT_IDS, EXPRESSIONS, type ComicPageData, type PanelData } from "./types";
import { FALLBACK_PAGE, MAX_TEXT, sanitizePage } from "./validate";

const PUBLIC = resolve(__dirname, "../../public/assets");
const panel = (over: Record<string, unknown> = {}) => ({
  id: "p1", environment: "warehouse_floor", characters: [], effects: [], narration: null, dialogue: [], emphasis: null, ...over,
});

describe("sanitizePage", () => {
  it("accepts every page the backend actually sends, with no problems", () => {
    for (const v of roundViews.slice(0, 10)) {
      const { page, problems } = sanitizePage(v.scene.page);
      expect(problems, `round ${v.scene.round}`).toEqual([]);
      expect(page.panels.length).toBeGreaterThan(0);
    }
  });

  it("drops unknown environments, characters, expressions and effects instead of rendering them", () => {
    const { page, problems } = sanitizePage({
      layout: "two",
      panels: [
        panel({ environment: "moon_base" }),
        panel({ id: "p2", characters: [{ id: "kavya", expression: "furious", side: "left" }, { id: "kavya", expression: "calm", side: "left" }],
          effects: ["lasers", "smoke"] }),
      ],
    });
    expect(page.panels).toHaveLength(1);
    expect(page.panels[0].characters).toHaveLength(1);
    expect(page.panels[0].effects).toEqual(["smoke"]);
    expect(problems.join("|")).toMatch(/moon_base.*|furious|lasers/);
  });

  it("limits panels to the layout, truncates long text and strips control characters", () => {
    const long = "x".repeat(MAX_TEXT + 40);
    const { page } = sanitizePage({ layout: "single", panels: [panel({ narration: long }), panel({ id: "p2" }), panel({ id: "p3" })] });
    expect(page.panels).toHaveLength(2);
    expect(page.panels[0].narration!.length).toBeLessThanOrEqual(MAX_TEXT);
    const { page: p2 } = sanitizePage({ layout: "single", panels: [panel({ narration: "a\u0000b\u0007c" })] });
    expect(p2.panels[0].narration).toBe("a b c");
  });

  it("never throws on garbage and returns the fallback page", () => {
    for (const bad of [null, undefined, 5, "x", [], { layout: 3 }, { layout: "single", panels: "no" }, { panels: [null, 4] }]) {
      expect(() => sanitizePage(bad)).not.toThrow();
      expect(sanitizePage(bad).page.panels.length).toBeGreaterThan(0);
    }
    expect(sanitizePage(null).page).toEqual(FALLBACK_PAGE);
  });
});

describe("ComicPage", () => {
  it("renders each backend page with the right layout, panels, bubbles and narration", () => {
    for (const v of roundViews.slice(0, 10)) {
      const page = v.scene.page!;
      const { container, unmount } = render(<ComicPage page={page} title={v.scene.title} />);
      expect(container.querySelector(".comic-page")).toHaveAttribute("data-layout", page.layout);
      expect(container.querySelectorAll("figure.panel")).toHaveLength(page.panels.length);
      const spoken = page.panels.flatMap((p) => p.dialogue.map((d) => d.text));
      for (const t of spoken) expect(container).toHaveTextContent(t);
      const narrated = page.panels.filter((p) => p.narration).length;
      expect(container.querySelectorAll(".narration")).toHaveLength(narrated);
      unmount();
    }
  });

  it("describes each panel for assistive technology and labels speakers", () => {
    render(<ComicPage page={roundViews[1].scene.page} title="Smoke" />);
    const figs = screen.getAllByRole("figure");
    expect(figs[2]).toHaveAccessibleName(/Terminal Supervisor looks angry/);
    expect(screen.getByRole("group", { name: /Terminal Supervisor says/ })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Smoke" })).toBeInTheDocument();
  });

  it("renders effects only from the trusted component map, at most four per panel", () => {
    const page: ComicPageData = { layout: "single", panels: [panel({ effects: [...EFFECT_IDS] }) as never] };
    const { container } = render(<ComicPage page={page} />);
    const svg = container.querySelector("svg.effects")!;
    expect(svg.getAttribute("data-effects")!.split(" ")).toEqual(EFFECT_IDS.slice(0, 4));
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("can render every individual effect", () => {
    for (const id of EFFECT_IDS) {
      const { container, unmount } = render(<ComicPage page={{ layout: "single", panels: [panel({ effects: [id] })] }} />);
      expect(container.querySelector("svg.effects g, svg.effects polygon, svg.effects rect"), id).not.toBeNull();
      unmount();
    }
  });

  it("falls back to the original image art when a drawing cannot render, and then to a labelled stand-in", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);   // React logs caught render errors
    const p = panel({ environment: "alt_depot", characters: [{ id: "nisha", expression: "worried", side: "left" }] }) as unknown as PanelData;
    const plan = planShot(p);
    const broken = { ...plan, camera: undefined, placements: plan.placements.map((q) => ({ ...q, face: undefined })) } as unknown as ShotPlan;
    const { container } = render(<ComicPanel panel={p} plan={broken} />);
    quiet.mockRestore();
    fireEvent.error(container.querySelector("img.bg")!);
    fireEvent.error(container.querySelector(".char img")!);
    expect(container.querySelector('[data-fallback="environment"]')).toBeInTheDocument();
    expect(container.querySelector('[data-fallback="character"]')).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Operations Manager \(image unavailable\)/ })).toBeInTheDocument();
  });

  it("treats dialogue as plain text: markup in data is shown literally, never executed", () => {
    const evil = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const page = { layout: "single", panels: [panel({ narration: evil, dialogue: [{ speaker: "arjun", text: evil, kind: "speech" }] })] };
    const { container } = render(<ComicPage page={page} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelectorAll("img[src='x']")).toHaveLength(0);
    expect(container.textContent).toContain("<img src=x");
  });

  it("renders the fallback page for invalid input rather than crashing", () => {
    render(<ComicPage page={{ nonsense: true }} />);
    expect(screen.getByText("The scene could not be displayed.")).toBeInTheDocument();
  });
});

describe("source safety", () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") || p.endsWith(".ts") ? [p] : [];
  });
  it("never uses dangerouslySetInnerHTML, innerHTML or eval", () => {
    for (const f of walk(resolve(__dirname, ".."))) {
      if (f.endsWith(".test.tsx") || f.endsWith(".test.ts")) continue;
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(/);
    }
  });
});

describe("asset manifest", () => {
  it("lists only files that exist", () => {
    const paths = [
      ...Object.values(manifest.environments).map((e) => e.path),
      ...Object.values(manifest.characters).flatMap((c) => Object.values(c.expressions)),
      ...Object.values(manifest.ui).map((u) => u.path),
    ];
    expect(paths.length).toBeGreaterThan(50);
    for (const p of paths) expect(existsSync(join(PUBLIC, p)), p).toBe(true);
  });

  it("covers every id the renderer accepts", () => {
    for (const id of ENVIRONMENT_IDS) expect(manifest.environments[id], id).toBeDefined();
    for (const c of CHARACTER_IDS) for (const e of EXPRESSIONS) expect(manifest.characters[c]?.expressions[e], `${c}/${e}`).toBeDefined();
    for (const id of EFFECT_IDS) expect(manifest.effects[id], id).toBeDefined();
    expect(Object.keys(EFFECT_COMPONENTS).sort()).toEqual([...EFFECT_IDS].sort());
  });

  it("has a different pose for every expression (no accidental duplicates)", () => {
    const dir = join(PUBLIC, "characters");
    for (const c of CHARACTER_IDS) {
      const files = EXPRESSIONS.map((e) => readFileSync(join(dir, `${c}_${e}.svg`), "utf8"));
      expect(new Set(files).size, c).toBe(EXPRESSIONS.length);
    }
  });
});

describe("within helper sanity", () => {
  it("renders narration inside its panel", () => {
    render(<ComicPage page={roundViews[0].scene.page} />);
    const first = screen.getAllByRole("figure")[0];
    expect(within(first).getByRole("note")).toHaveTextContent("Tuesday 27 June 2017");
  });
});
