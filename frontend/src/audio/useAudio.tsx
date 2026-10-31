import { useEffect, useSyncExternalStore } from "react";
import { audio, type AudioSettings, type Mood } from "./audio";

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(audio.subscribe, audio.getSettings, audio.getSettings);
}

/** Sets the music mood for the current screen. */
export function useMood(mood: Mood): void {
  useEffect(() => { audio.setMood(mood); }, [mood]);
}

/** One quick button to silence (or restore) music and effects. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const s = useAudioSettings();
  const on = s.music || s.sfx;
  return (
    <button type="button" className={`snd-toggle ${className}`} aria-pressed={on} aria-label={on ? "Sound is on. Turn sound off" : "Sound is off. Turn sound on"} title={on ? "Sound on" : "Sound off"} onClick={() => audio.toggleAll()}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />{on ? <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
      </svg>
    </button>
  );
}
