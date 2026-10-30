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

export function characterInfo(id: CharacterId): { name: string; role: string } {
  const c = manifest.characters[id];
  return { name: c?.name ?? id, role: c?.role ?? "" };
}

export const uiUrl = (id: string) => (manifest.ui[id] ? assetUrl(manifest.ui[id].path) : undefined);
