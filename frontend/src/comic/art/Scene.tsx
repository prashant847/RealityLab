import { memo, useId } from "react";
import { ENVIRONMENTS, ENV_FOCUS } from "./environments";
import { Extra } from "./geometry";
import type { ShotPlan } from "./shots";
import type { EnvironmentId } from "../types";

/** The inked environment for one panel, seen through the planned camera window. */
export const Scene = memo(function Scene({ environment, plan }: { environment: EnvironmentId; plan: ShotPlan }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const Env = ENVIRONMENTS[environment];
  const { x, y, w } = plan.camera;
  const extras = plan.showExtras ? ENV_FOCUS[environment].extras : [];
  return (
    <svg className="bg bg--art" viewBox={`${x} ${y} ${w} ${(w * 9) / 16}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" data-env={environment}
      style={plan.blur ? { filter: `blur(${plan.blur}px)`, transform: "scale(1.06)" } : undefined}>
      <Env lit={plan.lit} alert={plan.alert} uid={uid} />
      {extras.map(([ex, ey, s, torch], i) => <Extra key={i} x={ex} y={ey} s={s} torch={torch && !plan.lit} facing={i % 2 ? -1 : 1} />)}
      {plan.dim > 0 && <rect x="-200" y="-200" width="2000" height="1300" fill="#03060b" opacity={plan.dim} />}
    </svg>
  );
});
