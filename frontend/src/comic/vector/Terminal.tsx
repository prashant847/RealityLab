import { C, Glow, INK, SceneSvg } from "./system";

export type Severity = "failed" | "warning" | "info";

export interface EvidenceRow { title: string; status: string; severity: Severity; detail: string }

const STATUS: [RegExp, string, Severity][] = [
  [/not responding/i, "NOT RESPONDING", "failed"],
  [/offline/i, "OFFLINE", "failed"],
  [/unusual|suspicious/i, "UNUSUAL", "warning"],
];

/** Turns the scene's known facts into evidence rows using only words already in them. One fact can give several rows
 *  ("Inventory dashboard offline; barcode scanners are not responding" gives two failures). */
export function evidenceRows(facts: string[]): EvidenceRow[] {
  const rows: EvidenceRow[] = [];
  for (const fact of facts) {
    if (/budget|₹|lakh/i.test(fact)) continue;                         // money is not system evidence
    const text = fact.replace(/^[A-Z][a-z]+:\s*/, "");                  // drop a speaker prefix such as "Arjun:"
    for (const clause of text.split(/;\s*/).map((c) => c.trim().replace(/\.$/, "")).filter(Boolean)) {
      const hit = STATUS.find(([re]) => re.test(clause));
      if (!hit) continue;
      const m = clause.search(hit[0]);
      let title = clause.slice(0, m).trim().replace(/\s+(are|is|appear|in)$/i, "");
      const logs = /access logs?/i.test(clause);
      if (logs) title = "Access logs";
      if (!title) title = clause.split(" ").slice(0, 3).join(" ");
      title = title.charAt(0).toUpperCase() + title.slice(1);
      const detail = "";
      rows.push({ title, status: hit[1], severity: hit[2], detail: logs ? text.replace(/\.$/, "").replace(/^./, (c) => c.toUpperCase()) : detail });
    }
  }
  return rows.slice(0, 4);
}

const wrap = (s: string, n: number): string[] => {
  const out: string[] = []; let line = "";
  for (const w of s.split(/\s+/)) { if ((line + " " + w).trim().length > n) { out.push(line); line = w; } else line = (line + " " + w).trim(); }
  if (line) out.push(line);
  return out.slice(0, 3);
};

/** The failed inventory terminal. Every row is one of the scene's own known facts, labelled FAILED / WARNING so the problem is readable at a glance. */
export function Terminal({ facts }: { facts: string[] }) {
  const rows = evidenceRows(facts);
  const color = (s: Severity) => (s === "failed" ? C.red : s === "warning" ? C.amber : C.cyan);
  return (
    <SceneSvg label={`The inventory terminal. ${rows.map((r) => `${r.title}: ${r.status}`).join(". ")}`}>
      <rect width="1600" height="900" fill={C.wall} />
      <rect y="690" width="1600" height="210" fill="#32425c" stroke={INK} strokeWidth="6" />
      <Glow x={800} y={420} r={620} kind="cyan" o={0.16} /><Glow x={1340} y={90} r={360} o={0.25} />
      {/* monitor */}
      <rect x="250" y="70" width="1100" height="640" rx="22" fill="#16233a" stroke={INK} strokeWidth="8" />
      <rect x="276" y="96" width="1048" height="560" rx="8" fill="#0c1627" stroke={INK} strokeWidth="4" />
      <rect x="276" y="96" width="1048" height="66" fill="#16314f" stroke={INK} strokeWidth="4" />
      <text x="310" y="140" fontSize="32" fontWeight="800" fill={C.white} fontFamily="Bahnschrift, 'Arial Narrow', Arial, sans-serif" letterSpacing="3">MERIDIAN INVENTORY SYSTEM</text>
      <circle cx="1270" cy="129" r="12" fill={C.red} stroke={INK} strokeWidth="3" /><text x="1244" y="139" textAnchor="end" fontSize="24" fontWeight="800" fill="#ffb7a8" fontFamily="Arial, sans-serif">NO SIGNAL</text>
      {rows.length === 0 && <text x="800" y="400" textAnchor="middle" fontSize="40" fill={C.steelHi} fontFamily="Arial, sans-serif">No system information available</text>}
      {rows.map((r, i) => {
        const y = 186 + i * 148, col = color(r.severity);
        const lines = wrap(r.detail || "", 40);
        return (
          <g key={i}>
            <rect x="306" y={y} width="988" height="130" rx="10" fill="#122237" stroke={col} strokeWidth="5" />
            <rect x="306" y={y} width="18" height="130" fill={col} />
            {/* status icon */}
            <circle cx="384" cy={y + 65} r="34" fill={col} stroke={INK} strokeWidth="4" />
            {r.severity === "failed" ? <path d={`M368 ${y + 49} l32 32 M400 ${y + 49} l-32 32`} stroke={INK} strokeWidth="8" strokeLinecap="round" /> : <><rect x="380" y={y + 44} width="8" height="24" fill={INK} /><rect x="380" y={y + 74} width="8" height="8" fill={INK} /></>}
            <text x="446" y={y + (lines.length ? 58 : 80)} fontSize="40" fontWeight="800" fill={C.white} fontFamily="Arial, sans-serif">{r.title}</text>
            {lines.map((l, k) => <text key={k} x="446" y={y + 92 + k * 30} fontSize="26" fill="#b9c8da" fontFamily="Arial, sans-serif">{l}</text>)}
            <rect x="960" y={y + 30} width="310" height="50" rx="25" fill={col} stroke={INK} strokeWidth="4" />
            <text x="1115" y={y + 65} textAnchor="middle" fontSize="25" fontWeight="800" fill={INK} fontFamily="Arial, sans-serif" letterSpacing="1.5">{r.status}</text>
          </g>
        );
      })}
      <path d="M296 640 H1304" stroke="#2a4466" strokeWidth="3" />
      {/* stand, keyboard, scanner */}
      <rect x="740" y="710" width="120" height="40" fill="#3d5169" stroke={INK} strokeWidth="5" /><rect x="620" y="744" width="360" height="26" rx="6" fill="#3d5169" stroke={INK} strokeWidth="5" />
      <g transform="translate(1180 790) rotate(-6)"><rect x="-70" y="-30" width="140" height="60" rx="14" fill="#2a3446" stroke={INK} strokeWidth="5" /><rect x="-24" y="-12" width="48" height="12" rx="6" fill={C.red} stroke={INK} strokeWidth="2.5" /><path d="M0 30 q-10 50 -60 60" stroke={INK} strokeWidth="8" fill="none" /></g>
          </SceneSvg>
  );
}
