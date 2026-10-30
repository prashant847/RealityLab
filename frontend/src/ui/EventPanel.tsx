import type { GameEvent } from "../api/types";
import { ComicPanel } from "../comic/ComicPanel";
import { EFFECT_IDS, type EffectId, type EnvironmentId, type PanelData } from "../comic/types";

const KNOWN = new Set<string>(EFFECT_IDS);

/** A consequence/revelation panel built from a backend event record. */
export function EventPanel({ event, environment }: { event: GameEvent; environment: EnvironmentId }) {
  const panel: PanelData = {
    id: `ev-${event.event_id}`.slice(0, 24), environment, characters: [],
    effects: event.assets.filter((a): a is EffectId => KNOWN.has(a)), narration: `${event.clock} — ${event.title}`,
    dialogue: [], emphasis: "warning",
  };
  return (
    <div className="event">
      <ComicPanel panel={panel} />
      <p className="event-text">{event.text}</p>
      {event.effects.length > 0 && <p className="chips">{event.effects.map((e) => <span key={e} className="chip">{e}</span>)}</p>}
    </div>
  );
}
