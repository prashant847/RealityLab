import manifestJson from "../../public/assets/manifest.json";
import type { CharacterId, EnvironmentId, Expression } from "./types";

interface Manifest {
  environments: Record<string, { path: string; width: number; height: number; description: string }>;
  characters: Record<string, { name: string; role: string; expressions: Record<string, string> }>;
  effects: Record<string, { kind: string; description: string }>;
  ui: Record<string, { path: string }>;
}
export const manifest = manifestJson as unknown as Manifest;

export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;

/** URL for an environment image, or undefined if the manifest has no such entry. */
export function environmentUrl(id: EnvironmentId): string | undefined {
  const e = manifest.environments[id];
  return e ? assetUrl(e.path) : undefined;
}

/** URL for a character pose; falls back to the "calm" pose, then to undefined. */
export function characterUrl(id: CharacterId, expression: Expression): string | undefined {
  const c = manifest.characters[id];
  const path = c?.expressions[expression] ?? c?.expressions.calm;
  return path ? assetUrl(path) : undefined;
}

/** On screen the six characters are fictional roles (the backend ids stay as they are). */
const ROLES: Record<string, { name: string; role: string }> = {
  player: { name: "Recovery Team Lead", role: "Leads the recovery effort" },
  arjun: { name: "IT Lead", role: "IT systems and incident analysis" },
  kavya: { name: "Terminal Supervisor", role: "Site safety and terminal operations" },
  nisha: { name: "Operations Manager", role: "Operations and recovery planning" },
  raghav: { name: "Network Administrator", role: "Networks, connections and routes" },
  isha: { name: "Customer Representative", role: "Customers and communication" },
};
export function characterInfo(id: CharacterId): { name: string; role: string } {
  const c = manifest.characters[id];
  return ROLES[id] ?? { name: c?.name ?? id, role: c?.role ?? "" };
}

export const uiUrl = (id: string) => (manifest.ui[id] ? assetUrl(manifest.ui[id].path) : undefined);
