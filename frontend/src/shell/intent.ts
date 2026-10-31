/** What the student chose on the path page ("Continue where I left off" or "Start new"), handed to the screen that opens next. Lasts one navigation. */
const KEY = "rl.go";
export type Intent = "continue" | "new";

export function setIntent(i: Intent): void { try { sessionStorage.setItem(KEY, i); } catch { /* storage unavailable: the next screen simply asks */ } }
export function takeIntent(): Intent | null {
  try { const v = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); return v === "continue" || v === "new" ? v : null; } catch { return null; }
}

/** BLACKOUT keeps its own resume pointer: a fresh start must skip it once. */
const FRESH = "rl.fresh";
export function markFresh(): void {
  try { sessionStorage.setItem(FRESH, "1"); localStorage.removeItem("realitylab.simulationId"); } catch { /* ignore */ }
}
export function takeFresh(): boolean {
  try { const v = sessionStorage.getItem(FRESH) === "1"; sessionStorage.removeItem(FRESH); return v; } catch { return false; }
}
