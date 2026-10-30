import { useState } from "react";
import { ArtBoundary } from "./art/ArtBoundary";
import { Figure } from "./art/Figure";
import type { ShotPlan } from "./art/shots";
import { characterInfo, characterUrl } from "./assets";
import type { CharacterId, CharacterPlacement, Expression } from "./types";

function Silhouette({ id }: { id: string }) {
  const { name } = characterInfo(id as never);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <svg className="char-fallback" viewBox="0 0 60 80" role="img" aria-label={`${name} (image unavailable)`} data-fallback="character">
      <path d="M4 80 L10 58 Q14 50 30 48 Q46 50 50 58 L56 80 Z" fill="#2f4560" />
      <ellipse cx="30" cy="30" rx="13" ry="16" fill="#4a6a8a" />
      <text x="30" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0b1220">{initials}</text>
    </svg>
  );
}

/** Last-resort art: the original placeholder pose image, then a labelled silhouette. */
function ImageCharacter({ id, expression }: { id: CharacterId; expression: Expression }) {
  const [failed, setFailed] = useState(false);
  const url = characterUrl(id, expression);
  const { name } = characterInfo(id);
  return url && !failed
    ? <img src={url} alt={`${name}, ${expression}`} draggable={false} onError={() => setFailed(true)} />
    : <Silhouette id={id} />;
}

export function CharacterLayer({ characters, plan }: { characters: CharacterPlacement[]; plan: ShotPlan }) {
  return (
    <div className="characters">
      {plan.placements.map((p) => {
        const c = characters.find((q) => q.id === p.id);
        const { name } = characterInfo(p.id);
        return (
          <div key={`${p.id}-${p.view}`} className={`char char--${c?.side ?? "center"}${p.speaking ? " is-speaking" : ""}${p.full ? " char--full" : ""}`}
            data-character={p.id} data-expression={c?.expression} data-emotion={p.face?.emotion} data-pose={p.pose}
            style={{ left: `${p.x}%`, bottom: `${p.bottom}%`, height: `${p.height}%`, zIndex: p.z, filter: p.dim ? `brightness(${1 - p.dim})` : undefined }}>
            <ArtBoundary fallback={<ImageCharacter id={p.id} expression={c?.expression ?? "calm"} />}>
              <Figure id={p.id} face={p.face} pose={p.pose} facing={p.facing} view={p.view} light={p.light} lightFrom={p.lightFrom} full={p.full}
                label={p.view === "back" ? `${name}, seen from behind` : `${name}, ${String(p.face?.emotion).replace(/_/g, " ")}`} />
            </ArtBoundary>
          </div>
        );
      })}
    </div>
  );
}
