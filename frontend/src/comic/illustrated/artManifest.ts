import manifestJson from "../../../public/assets/art/manifest.json";

// Illustrated-art manifest: stable asset ids -> real image files, with an honest status for each.
//   real        finished illustration
//   placeholder labelled stand-in image, NOT final art (shown with a visible tag)
//   needed      no file exists yet
export const ART_STATUSES = ["real", "placeholder", "needed"] as const;
export const ART_KINDS = ["environment", "character", "foreground"] as const;
export type ArtStatus = (typeof ART_STATUSES)[number];
export type ArtKind = (typeof ART_KINDS)[number];
export interface ArtCredit { title: string; source: string; original: string; author: string; license: string; licenseUrl: string; attributionRequired: boolean; changes: string; /** What the Commons file page itself says about the licence. */ evidence?: string }
export interface ArtAsset { kind: ArtKind; path: string; width: number; height: number; status: ArtStatus; alt: string; brief: string; fit?: string; credit?: ArtCredit }
export interface ArtManifest { version: number; note: string; assets: Record<string, ArtAsset> }

export const artManifest = manifestJson as unknown as ArtManifest;

export const artUrl = (path: string) => `${import.meta.env.BASE_URL}assets/art/${path}`;
export const getAsset = (id: string): ArtAsset | undefined => artManifest.assets[id];

/** Problems with the manifest itself. `exists` lets a test (or a build step) check the files on disk. */
export function validateArtManifest(m: ArtManifest, exists?: (path: string) => boolean): string[] {
  const out: string[] = [];
  for (const [id, a] of Object.entries(m.assets)) {
    if (!/^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(id)) out.push(`${id}: id must be dotted lowercase`);
    if (!ART_KINDS.includes(a.kind)) out.push(`${id}: bad kind ${a.kind}`);
    if (!ART_STATUSES.includes(a.status)) out.push(`${id}: bad status ${a.status}`);
    if (!/\.(png|webp)$/i.test(a.path)) out.push(`${id}: ${a.path} is not a PNG or WebP`);
    if (!a.alt?.trim()) out.push(`${id}: missing alt text`);
    if (a.status !== "needed" && exists && !exists(a.path)) out.push(`${id}: file missing ${a.path}`);
    // 'real' means genuine third-party artwork with a recorded, checkable origin; placeholders must not carry one.
    const c = a.credit;
    if (a.status === "real") {
      if (!c) out.push(`${id}: real asset has no credit record`);
      else {
        for (const k of ["title", "source", "original", "author", "license", "licenseUrl", "changes"] as const) if (!String(c[k] ?? "").trim()) out.push(`${id}: credit.${k} is empty`);
        if (!/^https:\/\//.test(c.source ?? "") || !/^https:\/\//.test(c.licenseUrl ?? "")) out.push(`${id}: credit source and licenseUrl must be https links`);
        if (!a.fit?.trim()) out.push(`${id}: real asset needs a 'fit' note saying how closely it matches the brief`);
      }
    } else if (c) out.push(`${id}: only real assets may carry a credit`);
  }
  return out;
}
