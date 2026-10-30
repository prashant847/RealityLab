import { characterInfo } from "./assets";
import type { DialogueLine, Side } from "./types";

/** Bubble body is HTML text (plain text node, never markup); the tail/outline is SVG. */
export function SpeechBubble({ line, side }: { line: DialogueLine; side: Side }) {
  const { name } = characterInfo(line.speaker);
  const label = line.kind === "thought" ? `${name} thinks` : line.kind === "radio" ? `${name} on the radio` : `${name} says`;
  return (
    <div className={`bubble bubble--${line.kind} bubble--${side}`} role="group" aria-label={label}>
      <span className="bubble-name">{line.speaker === "player" ? "You" : name}</span>
      <p>{line.text}</p>
      {line.kind === "thought" ? (
        <svg className="bubble-tail" viewBox="0 0 40 26" aria-hidden="true">
          <circle cx="12" cy="6" r="5" /><circle cx="22" cy="15" r="3.5" /><circle cx="30" cy="22" r="2.2" />
        </svg>
      ) : line.kind === "radio" ? (
        <svg className="bubble-radio" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20 L12 4 M12 4 L9 3 M12 4 L15 3" /><rect x="8" y="12" width="12" height="8" rx="1.5" />
        </svg>
      ) : (
        <svg className="bubble-tail" viewBox="0 0 30 22" aria-hidden="true"><path d="M2 0 L10 21 L24 0" /></svg>
      )}
    </div>
  );
}
