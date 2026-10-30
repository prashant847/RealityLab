import { useState } from "react";
import { ArtBoundary } from "./art/ArtBoundary";
import { Scene } from "./art/Scene";
import type { ShotPlan } from "./art/shots";
import { environmentUrl, manifest } from "./assets";
import type { EnvironmentId } from "./types";

/** Original placeholder environment image. If it is missing too, a labelled gradient stands in. */
function ImageBackground({ environment }: { environment: EnvironmentId }) {
  const [failed, setFailed] = useState(false);
  const url = environmentUrl(environment);
  const label = manifest.environments[environment]?.description ?? environment.replace(/_/g, " ");
  if (!url || failed) {
    return (
      <div className="bg bg--fallback" data-fallback="environment" role="img" aria-label={label}>
        <span>{environment.replace(/_/g, " ")}</span>
      </div>
    );
  }
  return <img className="bg" src={url} alt="" draggable={false} onError={() => setFailed(true)} />;
}

/** The inked environment for the panel; falls back to the original image art if the drawing cannot render. */
export function SceneBackground({ environment, plan }: { environment: EnvironmentId; plan: ShotPlan }) {
  return (
    <ArtBoundary fallback={<ImageBackground environment={environment} />}>
      <Scene environment={environment} plan={plan} />
    </ArtBoundary>
  );
}
