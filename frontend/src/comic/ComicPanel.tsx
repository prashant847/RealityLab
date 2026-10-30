import { memo, useId, useMemo } from "react";
import { CharacterLayer } from "./CharacterLayer";
import { EffectOverlay } from "./EffectOverlay";
import { NarrationBox } from "./NarrationBox";
import { SceneBackground } from "./SceneBackground";
import { SpeechBubble } from "./SpeechBubble";
import { Evidence } from "./art/Evidence";
import { inkRect } from "./art/ink";
import { planShot, type ShotPlan } from "./art/shots";
import { characterInfo, manifest } from "./assets";
import type { PanelData, Side } from "./types";

/** SVG border: heavy ink outline, thin inner keyline, halftone corner; revelation panels get a burst. */
export function PanelFrame({ emphasis }: { emphasis: PanelData["emphasis"] }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg className="frame" viewBox="0 0 160 90" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id={`${uid}ht`} width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="1.3" cy="1.3" r="0.55" fill="#05080f" />
        </pattern>
        <linearGradient id={`${uid}fade`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#fff" /><stop offset="0.45" stopColor="#000" /></linearGradient>
        <mask id={`${uid}m`}><rect width="160" height="90" fill={`url(#${uid}fade)`} /></mask>
      </defs>
      <rect width="160" height="90" fill={`url(#${uid}ht)`} mask={`url(#${uid}m)`} opacity="0.26" />
      {emphasis === "revelation" && (
        <polygon className="burst" fill="none" vectorEffect="non-scaling-stroke"
          points="0,0 20,3 40,0 62,4 84,0 108,3 130,0 160,0 157,22 160,45 157,68 160,90 132,87 108,90 84,86 60,90 36,87 12,90 0,90 3,66 0,44 3,20" />
      )}
      <rect className="frame-outer" x="0" y="0" width="160" height="90" fill="none" vectorEffect="non-scaling-stroke" />
      <path className={`frame-inner${emphasis ? ` frame-inner--${emphasis}` : ""}`} d={inkRect(2.4, 2.4, 155.2, 85.2, uid, 0.35)} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Bubbles sit on the speaker's side, except when one person fills the frame: then the bubble goes to the empty side so it never covers the face. */
function bubbleSide(panel: PanelData, plan: ShotPlan, speaker: string): Side {
  const placed = plan.placements.length === 1 ? plan.placements[0] : undefined;
  if (placed && placed.id === speaker) return placed.x < 50 ? "right" : "left";
  return panel.characters.find((c) => c.id === speaker)?.side ?? "center";
}

function describe(panel: PanelData): string {
  const env = manifest.environments[panel.environment]?.description ?? panel.environment.replace(/_/g, " ");
  const who = panel.characters.map((c) => `${characterInfo(c.id).name} looks ${c.expression}`).join("; ");
  const fx = panel.effects.length ? ` Effects: ${panel.effects.map((e) => e.replace(/_/g, " ")).join(", ")}.` : "";
  return `${env}${who ? ` ${who}.` : ""}${fx}`;
}

export const ComicPanel = memo(function ComicPanel({ panel, index = 0, plan: given }: { panel: PanelData; index?: number; plan?: ShotPlan }) {
  const plan = useMemo(() => given ?? planShot(panel, index), [given, panel, index]);
  return (
    <figure
      className={`panel panel--${plan.kind}${panel.emphasis ? ` panel--${panel.emphasis}` : ""}`}
      style={{ animationDelay: `${index * 140}ms`, ["--ar" as string]: String(plan.ratio), ...(plan.tilt ? { ["--tilt" as string]: `${plan.tilt}deg` } : {}) }}
      data-shot={plan.kind}
      data-panel={panel.id}
      aria-label={describe(panel)}
    >
      <div className="stage">
        <SceneBackground environment={panel.environment} plan={plan} />
        <EffectOverlay effects={panel.effects} />
        <CharacterLayer characters={panel.characters} plan={plan} />
      </div>
      {plan.evidence && <Evidence large={plan.kind === "reveal"} />}
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <PanelFrame emphasis={panel.emphasis} />
      {(panel.narration || panel.dialogue.length > 0) && (
        <div className="overlay">
          {panel.narration && <NarrationBox text={panel.narration} />}
          <div className="bubbles">
            {panel.dialogue.map((d, i) => <SpeechBubble key={i} line={d} side={bubbleSide(panel, plan, d.speaker)} />)}
          </div>
        </div>
      )}
    </figure>
  );
});
