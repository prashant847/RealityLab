import { useId, type ReactElement } from "react";
import type { EffectId } from "./types";

// Every effect is a fixed, trusted SVG component drawn in a 160x90 space. Scene data only
// selects WHICH ones appear (ids are validated); it never supplies markup.
type FxProps = { uid: string };

const Rain = () => (
  <g className="fx-rain" stroke="#c5cfdb" strokeWidth="0.25" opacity="0.55">
    {Array.from({ length: 70 }, (_, i) => {
      const x = ((i * 37) % 190) - 15, y = (i * 53) % 100 - 10;
      return <line key={i} x1={x} y1={y} x2={x - 3} y2={y + 9} style={{ animationDelay: `${-(i % 9) * 0.11}s` }} />;
    })}
  </g>
);

const Smoke = ({ uid }: FxProps) => (
  <g>
    <defs>
      <radialGradient id={`${uid}-sm`}><stop offset="0" stopColor="#9aa6b4" stopOpacity="0.75" /><stop offset="1" stopColor="#9aa6b4" stopOpacity="0" /></radialGradient>
    </defs>
    {[[96, 78, 22], [110, 70, 26], [88, 62, 20], [104, 50, 24], [92, 38, 19]].map(([x, y, r], i) => (
      <circle key={i} className="fx-smoke" cx={x} cy={y} r={r} fill={`url(#${uid}-sm)`} style={{ animationDelay: `${-i * 1.1}s` }} />
    ))}
  </g>
);

const Sparks = ({ uid }: FxProps) => (
  <g>
    <defs>
      <radialGradient id={`${uid}-fl`}><stop offset="0" stopColor="#ffd9a0" stopOpacity="0.9" /><stop offset="1" stopColor="#e8a33d" stopOpacity="0" /></radialGradient>
    </defs>
    <circle className="fx-flash" cx="98" cy="46" r="14" fill={`url(#${uid}-fl)`} />
    {Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2, d = 4 + (i % 5) * 3;
      return <circle key={i} className="fx-spark" cx={98 + Math.cos(a) * d} cy={46 + Math.sin(a) * d * 0.8} r={0.45 + (i % 3) * 0.2}
        fill={i % 2 ? "#e8a33d" : "#ffd9a0"} style={{ animationDelay: `${-(i % 7) * 0.13}s` }} />;
    })}
  </g>
);

const WarningLights = ({ uid }: FxProps) => (
  <g className="fx-pulse">
    <defs>
      <radialGradient id={`${uid}-wl`}><stop offset="0" stopColor="#e8a33d" stopOpacity="0.85" /><stop offset="1" stopColor="#e8a33d" stopOpacity="0" /></radialGradient>
    </defs>
    <circle cx="6" cy="8" r="34" fill={`url(#${uid}-wl)`} />
    <circle cx="154" cy="8" r="34" fill={`url(#${uid}-wl)`} />
    <rect width="160" height="90" fill="#e8a33d" opacity="0.06" />
  </g>
);

const PowerFailure = () => (
  <g>
    <rect width="160" height="90" fill="#04070d" opacity="0.5" />
    <rect className="fx-flicker" width="160" height="90" fill="#04070d" opacity="0.35" />
  </g>
);

const DamagedInventory = () => (
  <g>
    <polygon points="8,90 8,74 30,70 36,90" fill="#10161f" stroke="#e8a33d" strokeWidth="0.5" />
    <polygon points="30,70 36,90 52,90 46,76" fill="#1a2330" stroke="#e8a33d" strokeWidth="0.5" />
    <polygon points="120,90 126,72 148,76 150,90" fill="#10161f" stroke="#c5cfdb" strokeWidth="0.4" />
    <polyline points="126,72 134,80 129,90" fill="none" stroke="#04070d" strokeWidth="1" />
    <rect x="60" y="84" width="9" height="5" fill="#2b3647" transform="rotate(-14 64 86)" />
    <rect x="76" y="86" width="7" height="4" fill="#3a2f20" transform="rotate(12 80 88)" />
    <rect x="100" y="85" width="8" height="4" fill="#2b3647" transform="rotate(-6 104 87)" />
  </g>
);

const SystemAlert = ({ uid }: FxProps) => (
  <g>
    <defs>
      <pattern id={`${uid}-sl`} width="4" height="2.2" patternUnits="userSpaceOnUse"><rect width="4" height="0.7" fill="#c5cfdb" opacity="0.1" /></pattern>
    </defs>
    <rect width="160" height="90" fill={`url(#${uid}-sl)`} />
    <g className="fx-pulse" transform="translate(139 6)">
      <polygon points="8,0 16,14 0,14" fill="#0b1220" stroke="#e8a33d" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="7.2" y="4.5" width="1.6" height="5" fill="#e8a33d" /><rect x="7.2" y="10.7" width="1.6" height="1.6" fill="#e8a33d" />
    </g>
  </g>
);

const EmergencyLighting = ({ uid }: FxProps) => (
  <g>
    <defs>
      <radialGradient id={`${uid}-el`}><stop offset="0" stopColor="#d9482f" stopOpacity="0.8" /><stop offset="1" stopColor="#d9482f" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width="160" height="90" fill="#7a1f12" opacity="0.14" />
    <g className="fx-pulse">
      <circle cx="12" cy="6" r="26" fill={`url(#${uid}-el)`} /><circle cx="148" cy="6" r="26" fill={`url(#${uid}-el)`} />
    </g>
  </g>
);

export const EFFECT_COMPONENTS: Record<EffectId, (p: FxProps) => ReactElement> = {
  rain: Rain, smoke: Smoke, sparks: Sparks, warning_lights: WarningLights, power_failure: PowerFailure,
  damaged_inventory: DamagedInventory, system_alert: SystemAlert, emergency_lighting: EmergencyLighting,
};

export function EffectOverlay({ effects }: { effects: EffectId[] }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (effects.length === 0) return null;
  return (
    <svg className="effects" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true" data-effects={effects.join(" ")}>
      {effects.map((id) => {
        const Fx = EFFECT_COMPONENTS[id];
        return Fx ? <Fx key={id} uid={`${uid}${id}`} /> : null;
      })}
    </svg>
  );
}
