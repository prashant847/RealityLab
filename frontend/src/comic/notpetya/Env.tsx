import { Shot, type ShotId } from "./Shots";

// Environments for the NotPetya story. Every room is a hand-inked comic-book illustration (public/assets/scene/env/<id>.webp, 1600 x 900,
// generated in the style of the Henry Stickmin backgrounds); a standing person is PERSON_UNITS tall in this frame with the feet on FLOOR_Y.
// Story props (cones, tape, trucks, tags, notes...) are comic-book images too (public/assets/scene/prop/<name>.webp); page effects are plain CSS.

export const PERSON_UNITS = 340;
export type EnvId = "warehouse_floor" | "control_room" | "electrical_area" | "loading_dock" | "ops_office" | "hospital_corridor" | "flooded_highway" | "alt_depot" | "press_scene";
export const ENV_IDS: EnvId[] = ["warehouse_floor", "control_room", "electrical_area", "loading_dock", "ops_office", "hospital_corridor", "flooded_highway", "alt_depot", "press_scene"];
/** What each (unchanged) backend environment id shows in this story. */
export const ENV_NAMES: Record<EnvId, string> = {
  warehouse_floor: "The open-plan office", control_room: "The server room", electrical_area: "The terminal quay", loading_dock: "The terminal gate",
  ops_office: "The operations centre", hospital_corridor: "The customer service floor", flooded_highway: "The road to the terminal", alt_depot: "The recovery room", press_scene: "The communications room",
};
export const FLOOR_Y: Record<EnvId, number> = { warehouse_floor: 800, control_room: 800, electrical_area: 800, loading_dock: 800, ops_office: 800, hospital_corridor: 800, flooded_highway: 800, alt_depot: 800, press_scene: 800 };
export const DESK_ENVS: EnvId[] = [];

const sceneUrl = (kind: "env" | "shot", name: string) => `${import.meta.env.BASE_URL}assets/scene/${kind}/${name}.webp`;

/** A comic illustration that fills its frame (cover, like the old 1600 x 900 slice) so overlays drawn in the 1600 x 900 space line up. */
export function ComicBackdrop({ kind, name, label }: { kind: "env" | "shot"; name: string; label: string }) {
  return <div className="np-backdrop" data-backdrop={`${kind}:${name}`} role="img" aria-label={label}><img src={sceneUrl(kind, name)} alt="" draggable={false} decoding="async" /></div>;
}


/** Where each story prop stands in the 16:9 frame: centre x and either bottom or top offset (percent of the frame) and width (percent of its width). */
interface PropSpot { src: string; x: number; w: number; bottom?: number; top?: number; label: string }
const PROP_SPOTS: Record<string, PropSpot | null> = {
  cones: { src: "cones", x: 47, bottom: 6, w: 9, label: "Traffic cones" },
  tape_barrier: { src: "tape", x: 50, bottom: 10, w: 62, label: "Caution tape across the area" },
  hold_tags: { src: "tags_red", x: 50, top: 4, w: 70, label: "Red hold tags" },
  verified_tags: { src: "tags_green", x: 50, top: 4, w: 70, label: "Green verified tags" },
  provisional_tags: { src: "tags_yellow", x: 50, top: 4, w: 70, label: "Yellow provisional tags" },
  effort_small: { src: "notes_few", x: 84, top: 10, w: 15, label: "A few sticky notes" },
  effort_medium: { src: "notes_some", x: 82, top: 10, w: 19, label: "A board of sticky notes" },
  effort_large: { src: "notes_many", x: 80, top: 8, w: 25, label: "A crowded board of sticky notes" },
  extra_trucks: { src: "truck", x: 17, bottom: 15, w: 36, label: "Extra hired trucks" },
  loaded_truck: { src: "truck", x: 83, bottom: 15, w: 36, label: "A loaded truck" },
  priority_truck: { src: "truck_priority", x: 17, bottom: 15, w: 36, label: "A priority truck" },
  detour_sign: { src: "detour", x: 12, bottom: 11, w: 7, label: "A detour sign" },
  stop_sign: { src: "stop", x: 90, bottom: 11, w: 4.5, label: "A stop sign" },
  order_sheets: { src: "order_sheets", x: 50, bottom: 3, w: 14, label: "Order sheets on the floor" },
  split_pallets: { src: "pallets", x: 50, bottom: 9, w: 32, label: "Pallets split in two" },
  podium: { src: "podium", x: 50, bottom: 7, w: 13, label: "A podium" },
  empty_podium: { src: "podium", x: 50, bottom: 7, w: 13, label: "An empty podium" },
  statement_card: { src: "podium_card", x: 50, bottom: 7, w: 13, label: "A podium with a statement card" },
  cables_cut: { src: "cables", x: 50, bottom: 4, w: 40, label: "Cut cables on the floor" },
  damaged_inventory: { src: "damaged", x: 28, bottom: 4, w: 22, label: "Damaged crates" },
  system_alert: { src: "alert", x: 92, top: 6, w: 6, label: "A warning sign" },
  // these three used to draw progress bars over the server racks; the picture says enough without them
  staged_recovery: null, rush_restore: null, account_locked: null,
};

/** Story props as comic images, in the 16:9 frame. */
export function NpProps({ ids }: { ids: string[] }) {
  return (
    <div className="np-props" aria-hidden="true">
      {ids.map((id) => {
        const p = PROP_SPOTS[id];
        if (!p) return null;
        const pos = p.top !== undefined ? { top: `${p.top}%` } : { bottom: `${p.bottom}%` };
        return <img key={id} className="np-prop" data-prop={id} src={`${import.meta.env.BASE_URL}assets/scene/prop/${p.src}.webp`} alt="" draggable={false} style={{ left: `${p.x}%`, width: `${p.w}%`, ...pos }} />;
      })}
    </div>
  );
}

/** Page effects as CSS light and shadow over the picture (no drawing). */
export function NpFx({ ids }: { ids: string[] }) {
  const has = (k: string) => ids.includes(k);
  return (
    <div className="np-fx" aria-hidden="true">
      {has("power_failure") && <i className="np-fx__dark" />}
      {has("emergency_lighting") && <i className="np-fx__amber" />}
      {has("warning_lights") && <><i className="np-fx__beacon np-fx__beacon--l" /><i className="np-fx__beacon np-fx__beacon--r" /></>}
      {has("damaged_inventory") && <NpProps ids={["damaged_inventory"]} />}
      {has("system_alert") && <NpProps ids={["system_alert"]} />}
    </div>
  );
}

/** The evidence board: one row per known fact, as a comic caption card over the operations centre. */
export function EvidenceBoard({ facts }: { facts: string[] }) {
  const rows = facts.filter((f) => !/budget|effort points|₹|lakh/i.test(f)).slice(0, 4);
  const sev = (t: string) => (/offline|not responding|down|failed|blocked|stuck|damage|reinfect|shortage|overstated|penalty|dark/i.test(t) ? "bad" : /unknown|unusual|suspicious|unverified|uncertain|may|risk|not sure|provisional/i.test(t) ? "maybe" : "ok");
  return (
    <div className="np-board" role="img" aria-label={`Evidence board. ${rows.join(" ")}`}>
      <ComicBackdrop kind="env" name="ops_office" label="" />
      <div className="np-board__card">
        <h3>What we know</h3>
        <ul>{rows.map((t, i) => <li key={i} data-sev={sev(t)}>{t}</li>)}</ul>
      </div>
    </div>
  );
}

/** Draws one environment with story props and page effects on top. */
export function NpEnv({ env, props = [], effects = [], facts = [], board = false, shot }: { env: EnvId; props?: string[]; effects?: string[]; facts?: string[]; board?: boolean; shot?: ShotId; seed?: number; round?: number }) {
  if (shot) return <>{<Shot id={shot} />}{effects.length > 0 && <NpFx ids={effects} />}</>;
  if (board) return <EvidenceBoard facts={facts} />;
  return <><ComicBackdrop kind="env" name={env} label={ENV_NAMES[env]} />{props.length > 0 && <NpProps ids={props} />}{effects.length > 0 && <NpFx ids={effects} />}</>;
}
