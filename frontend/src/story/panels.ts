import type { ShotId } from "../comic/notpetya/Shots";
import type { EnvId } from "../comic/notpetya/Env";
import type { Expr, StagePose, Who } from "../comic/notpetya/Cast";

// How each story panel is drawn so that the picture shows what the panel's own words say. Two kinds of panel:
//  - an object shot: a close picture of the thing the narration is about (failing monitors, an idle crane, a queue at a closed gate...);
//  - a speaker shot: the person who is talking, from the waist up in the room they are in, big enough to read their face.
// Backend panel ids are the keys. Panels not listed here fall back to the generic room-and-people layout.
export interface PanelPerson { who: Who; expr: Expr; pose?: StagePose; x: number; flip?: boolean }
export interface PanelShot { shot?: ShotId; env?: EnvId; people?: PanelPerson[] }

const P = (who: Who, expr: Expr, x: number, pose?: StagePose): PanelPerson => ({ who, expr, x, pose });

export const PANEL_SHOTS: Record<string, PanelShot> = {
  r1a: { shot: "monitors_failing" },
  r1b: { shot: "ransom_screen" },
  r1c: { env: "warehouse_floor", people: [P("arjun", "concern", 30, "clipboard"), P("worker_b", "shock", 72, "arms_crossed")] },
  r1d: { env: "control_room", people: [P("arjun", "concentration", 32)] },
  r2a: { shot: "crane_idle" },
  r2b: { shot: "paper_list" },
  r2c: { env: "electrical_area", people: [P("kavya", "frustration", 30, "point"), P("worker_c", "concern", 72)] },
  r3a: { shot: "gate_queue" },
  r3b: { env: "flooded_highway", people: [P("raghav", "concern", 30, "clipboard"), P("director", "concentration", 72)] },
  r3c: { shot: "route_map" },
  r4a: { shot: "two_numbers" },
  r4b: { env: "loading_dock", people: [P("arjun", "concern", 28, "clipboard"), P("kavya", "neutral", 72, "arms_crossed")] },
  r4c: { env: "loading_dock", people: [P("director", "concentration", 50, "hand_chin")] },
  r5a: { shot: "whiteboard" },
  r5b: { env: "ops_office", people: [P("nisha", "concern", 32, "clipboard")] },
  r5c: { env: "ops_office", people: [P("director", "tired", 50, "hand_chin")] },
  r6a: { shot: "update_diagram" },
  r6b: { env: "control_room", people: [P("arjun", "concentration", 30), P("director", "determination", 72)] },
  r6c: { shot: "wiped_disk" },
  r7a: { shot: "priority_choice" },
  r7b: { env: "hospital_corridor", people: [P("isha", "frustration", 30, "point"), P("director", "concern", 72)] },
  r7c: { env: "loading_dock", people: [P("director", "concern", 50, "hand_chin")] },
  r8a: { shot: "survivor_map" },
  r8b: { env: "alt_depot", people: [P("kavya", "concern", 30)] },
  r8c: { env: "alt_depot", people: [P("raghav", "tired", 70)] },
  r9a: { shot: "news_tv" },
  r9b: { env: "hospital_corridor", people: [P("isha", "concern", 30, "phone"), P("director", "determination", 72)] },
  r10a: { shot: "gate_open" },
  r10b: { env: "loading_dock", people: [P("raghav", "neutral", 28, "clipboard"), P("isha", "relief", 72)] },
};
