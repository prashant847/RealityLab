import type { Analysis } from "../api/types";

/** Decision-by-decision strip. Markers show where recovery was still possible, the last
 *  recoverable checkpoint, and the decision after which no recovery path remained. */
export function RecoveryTimeline({ analysis, rewindFrom }: { analysis: Analysis; rewindFrom?: number | null }) {
  const critical = analysis.critical_point?.checkpoint_index ?? null;
  const last = analysis.last_recoverable_checkpoint;
  return (
    <div className="timeline" aria-label="Decision timeline">
      <ol>
        {analysis.timeline.map((t) => {
          const state = t.index === critical ? "critical" : (t.tier_reached ?? 0) >= 3 ? "ok" : "after";
          return (
            <li key={t.index} className={`tl tl--${state}${t.index === last ? " tl--last" : ""}${t.index === rewindFrom ? " tl--from" : ""}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="tl-dot">
                {state === "critical" ? <path d="M12 2 L22 20 H2 Z" /> : <circle cx="12" cy="12" r="8" />}
                {t.index === last && <circle cx="12" cy="12" r="11" className="tl-ring" />}
              </svg>
              <span className="tl-round">R{t.round}</span>
              <span className="tl-label">{t.label}</span>
              <span className="tl-tag">
                {state === "critical" ? "Recovery window closed here" : t.index === last ? "Last recoverable checkpoint" : state === "ok" ? "Recovery still possible" : "After the window closed"}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="legend" aria-hidden="true">
        <span className="lg lg--ok" /> recoverable <span className="lg lg--critical" /> window closed <span className="lg lg--ring" /> rewind target
      </p>
    </div>
  );
}
