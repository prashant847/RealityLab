/** Accessibility settings. They are kept on this computer and applied to the whole window as attributes on <html>, so every screen follows them. */
import { useSyncExternalStore } from "react";

export interface A11y {
  textSize: 100 | 125 | 150 | 175 | 200;        // percent; the desktop app zooms the whole window, so layouts reflow
  contrast: "normal" | "high";
  colorblind: boolean;                            // colours that do not rely on telling red from green
  easyFont: boolean;                              // a plainer, wider-spaced font and looser lines
  bigTargets: boolean;                            // larger buttons, with more room between them
  readAloud: boolean;                             // show "Read aloud" buttons
  speechRate: number;                             // 0.6 to 1.4
}
export const A11Y_KEY = "rl.a11y";
export const TEXT_SIZES = [100, 125, 150, 175, 200] as const;
const DEFAULTS: A11y = { textSize: 100, contrast: "normal", colorblind: false, easyFont: false, bigTargets: false, readAloud: false, speechRate: 1 };

function load(): A11y {
  try {
    const r = JSON.parse(localStorage.getItem(A11Y_KEY) ?? "null") as Partial<A11y> | null;
    if (r) return {
      textSize: (TEXT_SIZES as readonly number[]).includes(r.textSize as number) ? (r.textSize as A11y["textSize"]) : 100,
      contrast: r.contrast === "high" ? "high" : "normal", colorblind: r.colorblind === true, easyFont: r.easyFont === true, bigTargets: r.bigTargets === true,
      readAloud: r.readAloud === true, speechRate: typeof r.speechRate === "number" ? Math.max(0.6, Math.min(1.4, r.speechRate)) : 1,
    };
  } catch { /* unreadable: defaults */ }
  return { ...DEFAULTS };
}

type Desktop = { setZoom?: (factor: number) => void; onZoom?: (cb: (factor: number) => void) => void };
const desktop = (): Desktop | undefined => (typeof window !== "undefined" ? (window as unknown as { rlDesktop?: Desktop }).rlDesktop : undefined);

let current: A11y = load();
const listeners = new Set<() => void>();

export function applyA11y(a: A11y = current): void {
  const h = document.documentElement.dataset;
  h.contrast = a.contrast; h.colorblind = String(a.colorblind); h.easyfont = String(a.easyFont); h.targets = a.bigTargets ? "large" : "normal"; h.readaloud = String(a.readAloud);
  h.textSize = String(a.textSize);
  desktop()?.setZoom?.(a.textSize / 100);                       // the desktop shell zooms the whole page (like Ctrl and +)
}
export const getA11y = (): A11y => current;
export function setA11y(patch: Partial<A11y>): void {
  current = { ...current, ...patch };
  try { localStorage.setItem(A11Y_KEY, JSON.stringify(current)); } catch { /* ignore */ }
  applyA11y(current);
  listeners.forEach((l) => l());
}
export function useA11y(): A11y { return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getA11y, getA11y); }

/** Keyboard zoom in the desktop shell (Ctrl and + / -) reports back so the setting stays in step. */
export function listenForDesktopZoom(): void {
  desktop()?.onZoom?.((f) => { const nearest = TEXT_SIZES.reduce((a, b) => (Math.abs(b - f * 100) < Math.abs(a - f * 100) ? b : a)); if (nearest !== current.textSize) { current = { ...current, textSize: nearest }; try { localStorage.setItem(A11Y_KEY, JSON.stringify(current)); } catch { /* ignore */ } applyA11y(current); listeners.forEach((l) => l()); } });
}
