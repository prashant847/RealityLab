import type { EnvId } from "../comic/flat/World";
import type { Expr, Pose, Who } from "../comic/flat/Person";

// Visual story data: how each decision looks when it is carried out, how each event looks when it hits, and how earlier decisions change the
// rooms later rounds are set in. This is presentation only: it names pictures; every fact and consequence still comes from the backend.
export interface Cast { who: Who; expr: Expr; pose?: Pose; at: "l" | "c" | "r" }
export interface Beat { env: EnvId; props?: string[]; effects?: string[]; cast: Cast[] }

const C = (who: Who, expr: Expr, at: Cast["at"], pose?: Pose): Cast => ({ who, expr, at, pose });

/** A decision being carried out. */
export const BEATS: Record<string, Beat> = {
  r1_isolate: { env: "control_room", props: ["cables_cut"], cast: [C("arjun", "focused", "r", "at_desk"), C("director", "determined", "l", "arms_crossed")] },
  r1_controlled: { env: "control_room", props: ["staged_recovery"], cast: [C("arjun", "focused", "r", "at_desk"), C("director", "neutral", "l")] },
  r1_rush: { env: "control_room", props: ["rush_restore"], cast: [C("arjun", "concerned", "r", "at_desk"), C("director", "determined", "l", "point")] },
  r2_evacuate: { env: "electrical_area", props: ["tape_barrier"], effects: ["smoke"], cast: [C("kavya", "determined", "r", "point"), C("worker", "concerned", "l")] },
  r2_secure: { env: "electrical_area", props: ["cones"], effects: ["smoke"], cast: [C("kavya", "focused", "r", "clipboard"), C("worker", "neutral", "l")] },
  r2_maintain: { env: "electrical_area", props: ["cones"], effects: ["smoke"], cast: [C("kavya", "concerned", "r", "arms_crossed"), C("worker", "neutral", "l")] },
  r3_alt_transport: { env: "flooded_highway", props: ["trucks_hired"], effects: ["rain"], cast: [C("raghav", "determined", "r", "clipboard")] },
  r3_divert_depot: { env: "flooded_highway", props: ["detour_sign"], effects: ["rain"], cast: [C("raghav", "determined", "r", "point")] },
  r3_reserve_hospital: { env: "flooded_highway", props: ["hospital_truck"], effects: ["rain"], cast: [C("raghav", "determined", "r", "arms_crossed")] },
  r4_pause: { env: "warehouse_floor", props: ["hold_tags"], cast: [C("arjun", "focused", "r", "clipboard"), C("worker", "concerned", "l")] },
  r4_release_verified: { env: "warehouse_floor", props: ["verified_tags"], cast: [C("arjun", "determined", "r", "clipboard"), C("worker", "neutral", "l")] },
  r4_provisional: { env: "warehouse_floor", props: ["provisional_tags"], cast: [C("arjun", "concerned", "r", "clipboard"), C("worker", "neutral", "l")] },
  r5_minimal: { env: "ops_office", props: ["cash_small"], cast: [C("nisha", "neutral", "l", "clipboard"), C("director", "neutral", "r")] },
  r5_balanced: { env: "ops_office", props: ["cash_medium"], cast: [C("nisha", "focused", "l", "clipboard"), C("director", "determined", "r")] },
  r5_restoration: { env: "ops_office", props: ["cash_large"], cast: [C("nisha", "concerned", "l", "clipboard"), C("director", "determined", "r")] },
  r5_logistics: { env: "ops_office", props: ["cash_large"], cast: [C("nisha", "concerned", "l", "clipboard"), C("director", "determined", "r")] },
  r5_negotiated: { env: "ops_office", props: ["cash_medium"], cast: [C("nisha", "determined", "l", "clipboard"), C("director", "focused", "r")] },
  r6_restrict: { env: "control_room", props: ["account_locked"], cast: [C("arjun", "focused", "r", "at_desk"), C("director", "determined", "l")] },
  r6_specialist: { env: "control_room", props: ["staged_recovery"], cast: [C("arjun", "neutral", "r", "at_desk"), C("worker", "focused", "c"), C("director", "neutral", "l")] },
  r6_parallel: { env: "control_room", props: ["staged_recovery", "account_locked"], cast: [C("arjun", "concerned", "r", "at_desk"), C("director", "determined", "l")] },
  r7_hospital_first: { env: "hospital_corridor", props: ["delivery_cart"], cast: [C("isha", "determined", "r", "point"), C("director", "determined", "l")] },
  r7_commitments: { env: "loading_dock", props: ["order_sheets"], cast: [C("raghav", "neutral", "r", "clipboard"), C("director", "concerned", "l")] },
  r7_negotiate: { env: "loading_dock", props: ["split_pallets"], cast: [C("raghav", "determined", "r", "clipboard"), C("isha", "concerned", "l", "arms_crossed")] },
  r8_transfer: { env: "alt_depot", props: ["boxes_in_transit"], cast: [C("raghav", "determined", "l", "point"), C("worker", "focused", "r")] },
  r8_restricted: { env: "alt_depot", props: ["cones"], cast: [C("kavya", "focused", "r", "clipboard"), C("worker", "neutral", "l")] },
  r8_suspend: { env: "alt_depot", props: ["stop_sign"], cast: [C("kavya", "determined", "r", "arms_crossed"), C("worker", "neutral", "l")] },
  r9_holding: { env: "press_scene", props: ["statement_card"], cast: [C("isha", "neutral", "l", "clipboard"), C("director", "determined", "r")] },
  r9_wait: { env: "press_scene", props: ["empty_podium"], cast: [C("director", "tired", "c", "hand_chin")] },
  r9_briefing: { env: "press_scene", props: ["podium"], cast: [C("arjun", "focused", "l"), C("director", "determined", "c"), C("kavya", "neutral", "r")] },
  r10_verified: { env: "loading_dock", props: ["loaded_truck"], cast: [C("raghav", "determined", "l", "clipboard"), C("isha", "neutral", "r")] },
  r10_sweep: { env: "loading_dock", props: ["sweep_torch"], cast: [C("raghav", "focused", "l", "point"), C("worker", "focused", "r")] },
  r10_provisional: { env: "loading_dock", props: ["loaded_truck"], cast: [C("director", "concerned", "l"), C("raghav", "concerned", "r", "arms_crossed")] },
};

/** An event happening. Keyed by the backend event id. */
export const EVENT_BEATS: Record<string, Beat> = {
  secondary_interruption: { env: "control_room", effects: ["power_failure", "system_alert"], cast: [C("arjun", "shocked", "r", "at_desk")] },
  secondary_interruption_partial: { env: "control_room", effects: ["system_alert"], cast: [C("arjun", "concerned", "r", "at_desk")] },
  flare_up: { env: "electrical_area", effects: ["smoke", "sparks", "warning_lights"], cast: [C("kavya", "shocked", "r"), C("worker", "shocked", "l")] },
  panel_failure_evacuated: { env: "electrical_area", props: ["tape_barrier"], effects: ["smoke", "sparks", "warning_lights"], cast: [C("kavya", "concerned", "r", "arms_crossed")] },
  panel_failure_assessed: { env: "electrical_area", props: ["cones"], effects: ["smoke", "sparks", "warning_lights"], cast: [C("kavya", "concerned", "r"), C("worker", "shocked", "l")] },
  dock_flooding: { env: "loading_dock", effects: ["rain", "damaged_inventory"], cast: [C("raghav", "shocked", "r")] },
  depot_scout_report: { env: "alt_depot", cast: [C("raghav", "neutral", "r", "clipboard")] },
  provisional_shortage: { env: "warehouse_floor", effects: ["damaged_inventory"], cast: [C("arjun", "concerned", "r", "clipboard"), C("nisha", "tired", "l")] },
  hospital_escalation: { env: "hospital_corridor", effects: ["warning_lights"], cast: [C("isha", "determined", "r", "point")] },
  insurer_advance: { env: "ops_office", props: ["cash_large"], cast: [C("nisha", "neutral", "l", "clipboard")] },
  reinfection_alert: { env: "control_room", effects: ["power_failure", "system_alert"], cast: [C("arjun", "shocked", "r", "at_desk")] },
  verified_route_pays_off: { env: "flooded_highway", props: ["hospital_truck"], cast: [C("raghav", "determined", "r", "arms_crossed")] },
  contract_penalty_notice: { env: "ops_office", cast: [C("nisha", "concerned", "l", "clipboard")] },
  power_dip: { env: "alt_depot", effects: ["power_failure", "emergency_lighting"], cast: [C("kavya", "concerned", "r")] },
  credit_due: { env: "ops_office", props: ["cash_small"], cast: [C("nisha", "tired", "l", "clipboard")] },
};

/** Who reads the evidence for the player in each round (the advisor whose job it is). */
export const ANALYST: Record<number, "arjun" | "kavya" | "nisha" | "raghav" | "isha"> = {
  1: "arjun", 2: "kavya", 3: "raghav", 4: "arjun", 5: "nisha", 6: "arjun", 7: "isha", 8: "kavya", 9: "isha", 10: "raghav",
};

/** The rooms later rounds are set in change with what the player chose earlier. */
export function carriedProps(env: EnvId, trail: string[], round: number): string[] {
  const has = (id: string) => trail.includes(id);
  const out: string[] = [];
  if (env === "control_room") {
    if (has("r1_isolate")) out.push("cables_cut"); else if (has("r1_controlled")) out.push("staged_recovery"); else if (has("r1_rush")) out.push("rush_restore");
    if (has("r6_restrict") || has("r6_parallel")) out.push("account_locked");
  }
  if (env === "electrical_area") {
    if (has("r2_evacuate")) out.push("tape_barrier"); else if (has("r2_secure") || has("r2_maintain")) out.push("cones");
  }
  if (env === "warehouse_floor" && round >= 5) {
    if (has("r4_pause")) out.push("hold_tags"); else if (has("r4_release_verified")) out.push("verified_tags"); else if (has("r4_provisional")) out.push("provisional_tags");
  }
  if (env === "ops_office") {
    if (has("r5_minimal")) out.push("cash_small"); else if (has("r5_balanced") || has("r5_negotiated")) out.push("cash_medium"); else if (has("r5_restoration") || has("r5_logistics")) out.push("cash_large");
  }
  if (env === "loading_dock" && round >= 4 && !has("r7_hospital_first")) {
    if (has("r3_alt_transport")) out.push("trucks_hired"); else if (has("r3_divert_depot")) out.push("detour_sign"); else if (has("r3_reserve_hospital")) out.push("hospital_truck");
  }
  if (env === "loading_dock") {
    if (has("r7_hospital_first")) out.push("loaded_truck"); else if (has("r7_negotiate")) out.push("split_pallets"); else if (has("r7_commitments")) out.push("order_sheets");
  }
  return out;
}

/** Effects an earlier decision leaves behind in a later room. */
export function carriedEffects(env: EnvId, trail: string[], round: number): string[] {
  // Rushing the systems back online without containment is what overloads the electrical panel in round 2.
  if (env === "electrical_area" && round >= 2 && trail.includes("r1_rush")) return ["warning_lights", "sparks"];
  if (env === "control_room" && round >= 7 && trail.includes("r6_parallel")) return ["system_alert"];
  return [];
}

/** How the director looks given what they have already put the team through. */
export function directorMood(trail: string[]): "concerned" | "determined" | null {
  if (trail.includes("r1_rush")) return "concerned";
  if (trail.includes("r1_isolate")) return "determined";
  return null;
}
