import { Fragment, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PanelFrame } from "../ComicPanel";
import { EffectOverlay } from "../EffectOverlay";
import { NarrationBox } from "../NarrationBox";
import { SpeechBubble } from "../SpeechBubble";
import type { PanelData, Side } from "../types";
import { sanitizePage } from "../validate";
import { ArtImage } from "./ArtImage";
import { getAsset, type ArtCredit } from "./artManifest";
import { FailedSystemScreen, SCREEN_H, SCREEN_W } from "./FailedSystemScreen";
import { homographyMatrix3d } from "./homography";
import type { Advice, Choice } from "../../api/types";
import type { ArtLayer, ArtPanelScript, ArtSceneScript } from "./scenes";

/** What the evidence dialog needs to let the player have the evidence analysed by the round's advisor. */
export interface EvidenceUse { analyst: string; role: string; advice?: Advice; busy: boolean; error?: string | null; choices: Choice[]; onAnalyse: () => void }

const reducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Reveals a panel once it scrolls into view (immediately where IntersectionObserver is unavailable). */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (seen || !el) return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

const VERDICT = { support: "Recommends", caution: "Has reservations", oppose: "Advises against", neutral: "No strong view" } as const;

function Analysis({ use }: { use: EvidenceUse }) {
  const { advice } = use;
  if (!advice) {
    return (
      <section className="analysis" aria-label="Analyse the evidence">
        <p className="muted">Have {use.analyst} ({use.role}) read this evidence for you. Their view of each option will appear here and on the decision cards.</p>
        <button type="button" className="primary" onClick={use.onAnalyse} disabled={use.busy}>{use.busy ? "Analysing…" : `Ask ${use.analyst} to analyse this`}</button>
        {use.error && <p className="alert" role="alert">{use.error}</p>}
      </section>
    );
  }
  const unverified = advice.private.filter((x) => !x.verified);
  return (
    <section className="analysis" aria-label={`${use.analyst}'s analysis`}>
      <blockquote>{advice.dialogue}</blockquote>
      <p className="muted">{use.analyst} is {advice.confidence}% confident in this reading.{advice.uncertainty ? ` ${advice.uncertainty}` : ""}</p>
      <ul className="stance-list">
        {advice.stances.map((s) => (
          <li key={s.choice_id} data-verdict={s.verdict}><span className={`stance-chip stance-chip--${s.verdict}`}>{VERDICT[s.verdict]}</span> <b>{s.label}</b>{s.reasons[0] && <span className="muted"> — {s.reasons[0]}</span>}</li>
        ))}
      </ul>
      {unverified.map((u, i) => <p key={i} className="unverified" role="note"><b>Unverified:</b> check this before relying on it ({Math.round(u.reliability * 100)}% sure themselves).</p>)}
      <p className="muted">These views are now marked on the decision options below.</p>
    </section>
  );
}

function InspectDialog({ layer, facts, use, onClose }: { layer: ArtLayer; facts: string[]; use?: EvidenceUse; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { close.current?.focus(); }, []);
  // Portalled to <body>: a panel is a containing block for fixed positioning (container-type, transform), which would trap the overlay inside it.
  return createPortal(
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Inspect the evidence" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="inspect">
        <div className="inspect-art"><ArtImage layer={{ ...layer, box: undefined, role: layer.role === "vector" || layer.role === "flatenv" ? layer.role : "background" }} facts={facts} /></div>
        {facts.length > 0 && <ul className="inspect-facts">{facts.map((f, i) => <li key={i}>{f}</li>)}</ul>}
        {use && <Analysis use={use} />}
        <button ref={close} type="button" className="primary" onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body,
  );
}

function IllustratedPanel({ script, source, index, facts, flat, use }: { script: ArtPanelScript; source?: PanelData; index: number; facts: string[]; flat?: boolean; use?: EvidenceUse }) {
  const assets = script.layers.map((l) => getAsset(l.asset));
  const placeholder = script.layers.some((l, i) => l.role !== "portrait" && l.role !== "vector" && l.role !== "person" && l.role !== "flatenv" && (!assets[i] || assets[i]!.status !== "real"));
  const sideOf = (id: string): Side => script.bubbleSide ?? source?.characters.find((c) => c.id === id)?.side ?? "center";
  const label = assets.map((a) => a?.alt).filter(Boolean).join(" ");
  const bgPlaceholder = script.layers[0]?.role !== "vector" && script.layers[0]?.role !== "flatenv" && assets[0]?.status !== "real";
  const { ref, seen } = useReveal();
  // The overlay is laid out in the photo's own pixels and scaled to however wide the panel is rendered.
  const [scale, setScale] = useState(0.4);
  const space = script.overlay?.space;
  useEffect(() => {
    const el = ref.current;
    if (!space || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setScale(el.getBoundingClientRect().width / space[0]));
    ro.observe(el);
    setScale(el.getBoundingClientRect().width / space[0] || 0.4);
    return () => ro.disconnect();
  }, [ref, space]);
  const overlay = useMemo(() => (script.overlay ? homographyMatrix3d(SCREEN_W, SCREEN_H, script.overlay.quad) : undefined), [script.overlay]);
  const [inspecting, setInspecting] = useState(false);
  const fg = script.layers.find((l) => l.role === "foreground" || l.role === "vector" || l.role === "flatenv");
  // Pointer parallax: layers drift by depth. Written straight to CSS variables so no React re-render happens per move.
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (reducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    e.currentTarget.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  return (
    <div className="panel-cell" style={{ gridColumn: script.span === 2 ? "1 / -1" : undefined }}>
    <figure ref={ref} className={`panel panel--art${seen ? " is-seen" : ""}`} onPointerMove={onMove}
      style={{ ["--ar" as string]: String(script.ratio), ["--delay" as string]: `${index * 90}ms` }}
      data-panel={script.id} data-label={script.label} data-bubble={script.bubbleBottom ? "bottom" : undefined} data-tone={script.tone} data-art-panel data-placeholder={placeholder} aria-label={label || script.id}>
      <div className="stage">
        {script.layers.map((l) => (
          <Fragment key={l.asset}>
            <ArtImage layer={l} facts={facts} />
            {l.role === "background" && script.overlay && overlay && (
              <div className="art art--background art--overlay" aria-hidden="true">
                <div className="fs-space" style={{ width: script.overlay.space[0], height: script.overlay.space[1], transform: `scale(${scale})` }}>
                  <div className="fs-quad" style={{ width: SCREEN_W, height: SCREEN_H, transform: overlay }}><FailedSystemScreen facts={facts} /></div>
                </div>
              </div>
            )}
          </Fragment>
        ))}
        {/* Effects dim the picture; they are skipped over placeholder backgrounds so the label stays readable. */}
        {source && !bgPlaceholder && !flat && <EffectOverlay effects={source.effects} />}
      </div>
      <div className="vignette" aria-hidden="true" />
      {placeholder && <span className="art-tag" role="note">PLACEHOLDER ART</span>}
      <PanelFrame emphasis={source?.emphasis ?? null} />
      {!source && script.narration && <div className="overlay"><NarrationBox text={script.narration} /></div>}
      {source && (source.narration || source.dialogue.length > 0) && (
        <div className="overlay">
          {source.narration && <NarrationBox text={source.narration} />}
          <div className="bubbles">{source.dialogue.map((d, i) => <SpeechBubble key={i} line={d} side={sideOf(d.speaker)} />)}</div>
        </div>
      )}
      {script.inspect && fg && <button type="button" className="inspect-btn" onClick={() => setInspecting(true)}>Inspect evidence</button>}
      {inspecting && fg && <InspectDialog layer={fg} facts={facts} use={use} onClose={() => setInspecting(false)} />}
    </figure>
    {script.caption && <p className="panel-caption">{script.caption}</p>}
    </div>
  );
}

/** Attribution for every real asset a script uses (required by the CC BY licences; shown for all real art). */
export function ArtCredits({ script }: { script: ArtSceneScript }) {
  const ids = [...new Set([...script.panels.flatMap((p) => p.layers.map((l) => l.asset)), script.decisionBackdrop])].filter((id) => !id.startsWith("vector.") && !id.startsWith("portrait."));
  const credited = ids.map((id) => ({ id, c: getAsset(id)?.credit })).filter((x): x is { id: string; c: ArtCredit } => Boolean(x.c));
  if (credited.length === 0) return null;
  return (
    <details className="art-credits">
      <summary>Image credits ({credited.length})</summary>
      <ul>{credited.map(({ id, c }) => (
        <li key={id}><a href={c.source} target="_blank" rel="noreferrer noopener">{c.title}</a> by {c.author}, <a href={c.licenseUrl} target="_blank" rel="noreferrer noopener">{c.license}</a>. {c.changes}</li>
      ))}</ul>
    </details>
  );
}

/** Illustrated comic page: image layers in the existing panel frame, text and effects from the backend's page data. */
export function IllustratedPage({ page, script, title, facts = [], evidence, children }: { page: unknown; script: ArtSceneScript; title?: string; facts?: string[]; evidence?: EvidenceUse; children?: ReactNode }) {
  const safe = useMemo(() => sanitizePage(page).page, [page]);
  return (
    <section className="comic-page comic-page--art" aria-label={title ?? "Comic page"} data-layout="illustrated" data-grade={script.grade ?? "cinematic"} style={{ ["--cols" as string]: script.columns }}>
      {script.panels.map((p, i) => <IllustratedPanel key={p.id} script={p} index={i} source={safe.panels.find((s) => s.id === p.source)} facts={facts} flat={script.grade === "flat"} use={evidence} />)}
      {children}
      <ArtCredits script={script} />
    </section>
  );
}

/** The final panel: the existing decision list on an illustrated backdrop. */
export function DecisionStage({ asset, children }: { asset: string; children: ReactNode }) {
  return (
    <div className="decision-stage" data-art-panel>
      <div className="decision-stage-bg" aria-hidden="true">{asset.startsWith("vector.") ? <ArtImage layer={{ asset, role: "vector", vector: asset.slice(7) as "office" }} /> : <ArtImage layer={{ asset, role: "background" }} />}</div>
      <div className="decision-stage-body">{children}</div>
    </div>
  );
}
