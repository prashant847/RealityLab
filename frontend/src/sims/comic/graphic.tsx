import { useEffect, useState, type ReactNode } from "react";
import { Bubble, FONT, INK } from "./ink";
import type { ComicPage } from "./firstSurge";

/**
 * Illustrated pages: a full-bleed picture (made offline, shipped as a static file) with all the words drawn by the app on top, never inside the picture:
 * narration boxes, speech bubbles and any labels. The same 1280 by 720 frame as the other comic pages, so the reader, keyboard and fit-to-window rules are shared.
 */
export interface Narration { lines: string[]; x: number; y: number; w: number }
export interface Speech { lines: string[]; x: number; y: number; w: number; tail: [number, number] }
export interface PanelSpec { id: string; src: string; alt: string; spoken: string; narration?: Narration[]; speech?: Speech[] }

/** A rectangular narration box in the manner of a graphic novel caption: cream paper, thin dark border, serif text. */
function NarrationBox({ lines, x, y, w }: Narration) {
  const h = 30 + lines.length * 34;
  return (
    <g fontFamily='Georgia, "Times New Roman", serif' fontWeight="600">
      <rect x={x + 6} y={y + 6} width={w} height={h} fill="#000" opacity="0.45" />
      <rect x={x} y={y} width={w} height={h} fill="#f5edd6" stroke={INK} strokeWidth="3" />
      {lines.map((t, i) => <text key={i} x={x + 18} y={y + 38 + i * 34} fontSize="26" fill="#1c1712">{t}</text>)}
    </g>
  );
}

export function GraphicPage({ p }: { p: PanelSpec }) {
  return (
    <svg viewBox="0 0 1280 720" className="ck-page" role="img" preserveAspectRatio="xMidYMid meet" aria-label={p.alt}>
      <defs>
        <linearGradient id="gn-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0.28" /><stop offset="0.22" stopColor="#000" stopOpacity="0" /><stop offset="0.7" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.4" /></linearGradient>
      </defs>
      <rect width="1280" height="720" fill="#14110f" />
      <image href={p.src} x="0" y="0" width="1280" height="720" preserveAspectRatio="xMidYMid slice" />
      <rect width="1280" height="720" fill="url(#gn-shade)" />
      <rect x="3" y="3" width="1274" height="714" fill="none" stroke={INK} strokeWidth="6" />
      {(p.speech ?? []).map((s, i) => <Bubble key={`s${i}`} x={s.x} y={s.y} w={s.w} lines={s.lines} tail={s.tail} />)}
      {(p.narration ?? []).map((n, i) => <NarrationBox key={`n${i}`} {...n} />)}
      <text x="1262" y="706" textAnchor="end" fontFamily={FONT} fontSize="15" fill="#fff" opacity="0.55">fictional scene</text>
    </svg>
  );
}

export const toComicPages = (panels: PanelSpec[]): ComicPage[] => panels.map((p) => ({ id: p.id, alt: p.alt, spoken: p.spoken, render: () => <GraphicPage p={p} /> }));

/** Whether every picture of an illustrated sequence has been shipped. If any is missing the app quietly uses its drawn comic instead. */
export function useIllustrated(panels: PanelSpec[] | null): "pending" | "yes" | "no" {
  const [state, setState] = useState<"pending" | "yes" | "no">(panels ? "pending" : "no");
  useEffect(() => {
    if (!panels) { setState("no"); return; }
    let live = true;
    Promise.all(panels.map((p) => fetch(p.src, { method: "HEAD" }).then((r) => r.ok && (r.headers.get("content-type") ?? "").startsWith("image/")).catch(() => false)))
      .then((all) => { if (live) setState(all.every(Boolean) ? "yes" : "no"); })
      .catch(() => { if (live) setState("no"); });
    return () => { live = false; };
  }, [panels]);
  return state;
}

export type { ReactNode };
