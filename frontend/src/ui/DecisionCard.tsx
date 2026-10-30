import { useState } from "react";
import type { Choice, StakeholderKey, Verdict } from "../api/types";
import { CHOICE_PLAIN } from "../story/plain";

export interface Endorsement { id: StakeholderKey; name: string; verdict: Verdict }
const MARK: Record<Verdict, string> = { support: "✓", caution: "?", oppose: "✗", neutral: "" };
const WORD: Record<Verdict, string> = { support: "recommends this", caution: "has reservations", oppose: "advises against this", neutral: "" };

export function DecisionCard({ choice, selected, onSelect, index, endorsements = [] }: {
  choice: Choice; selected: boolean; onSelect: () => void; index: number; endorsements?: Endorsement[];
}) {
  const disabled = !choice.available;
  return (
    <button
      type="button" role="radio" aria-checked={selected} aria-disabled={disabled}
      className={`decision${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}
      onClick={() => !disabled && onSelect()}
      aria-describedby={disabled ? `why-${choice.id}` : undefined}
    >
      <span className="decision-key" aria-hidden="true">{index + 1}</span>
      <span className="decision-body">
        <strong>{choice.label}</strong>
        <span className="decision-summary">{CHOICE_PLAIN[choice.id]?.means ?? choice.summary}</span>
        <span className="chips">
          <span className="chip">{choice.cost > 0 ? `₹${choice.cost.toFixed(1)} lakh` : "No cost"}</span>
          <span className="chip">{choice.time_cost > 0 ? `${choice.time_cost} min` : "No delay"}</span>
          {choice.confirm && <span className="chip chip--warn">Needs confirmation</span>}
        </span>
        {endorsements.length > 0 && (
          <span className="endorse" aria-label="Advisors' views">
            {endorsements.map((e) => (
              <span key={e.id} className={`endorse-chip endorse-chip--${e.verdict}`} title={`${e.name} ${WORD[e.verdict]}`}>
                <span aria-hidden="true">{MARK[e.verdict]}</span> {e.name.split(" ")[0]}<span className="sr-only"> {WORD[e.verdict]}</span>
              </span>
            ))}
          </span>
        )}
        {disabled && <span id={`why-${choice.id}`} className="decision-why">{choice.reason}</span>}
      </span>
    </button>
  );
}

/** Radio-group of options + a commit button. Consequential choices need a second, explicit confirmation. */
export function DecisionList({ choices, busy, onCommit, endorsements = {} }: {
  choices: Choice[]; busy?: boolean; onCommit: (choiceId: string) => void; endorsements?: Record<string, Endorsement[]>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const current = choices.find((c) => c.id === selected && c.available) ?? null;

  const select = (id: string) => { setSelected(id); setArmed(false); };
  const commit = () => {
    if (!current || busy) return;
    if (current.confirm && !armed) { setArmed(true); return; }
    onCommit(current.id);
    setSelected(null); setArmed(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const i = Number(e.key) - 1;
    if (Number.isInteger(i) && choices[i]?.available && !(e.target instanceof HTMLInputElement)) select(choices[i].id);
  };

  return (
    <div className="decisions" onKeyDown={onKey}>
      <div role="radiogroup" aria-label="Available decisions" className="decision-list">
        {choices.map((c, i) => (
          <DecisionCard key={c.id} choice={c} index={i} selected={c.id === selected} onSelect={() => select(c.id)} endorsements={endorsements[c.id]} />
        ))}
      </div>
      {armed && current && (
        <p className="confirm-note" role="alert">
          This decision has lasting consequences. Press the button again to confirm: <em>{current.label}</em>
        </p>
      )}
      <button type="button" className={`commit${armed ? " is-armed" : ""}`} disabled={!current || busy} onClick={commit}>
        {busy ? "Applying…" : armed ? "Confirm decision" : current ? "Commit decision" : "Select an option"}
      </button>
    </div>
  );
}
