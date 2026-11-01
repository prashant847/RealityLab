import { getA11y } from "../a11y/a11y";
import { stopSpeaking } from "../a11y/speak";

/**
 * Spoken lines for the story: the comic's narrator, the characters in a reaction scene and the Archivist. A line is fetched once from the local service
 * (a human voice when an ElevenLabs key is saved, otherwise the offline natural voice), kept for the session and played with a mouth meter measured from the real
 * audio. If no voice is available the clip is null and callers show the words for a reading-length pause instead.
 */
export type VoiceRole = "narrator" | "librarian" | "reader_female" | "reader_male" | `char_${string}`;
export interface Clip { url: string; ms: number }

export interface VoiceStatus { human: boolean; natural: boolean }
let status: Promise<VoiceStatus> | null = null;
export const voiceStatus = (fresh = false): Promise<VoiceStatus> => {
  if (fresh) status = null;
  return (status ??= typeof fetch !== "function" ? Promise.resolve({ human: false, natural: false })
    : fetch("/api/tts/status").then((r) => (r.ok ? r.json() : {})).then((j: { human?: boolean; voices?: string[] }) => ({ human: j.human === true, natural: (j.voices ?? []).length > 0 })).catch(() => ({ human: false, natural: false })));
};

/** True if story voices are switched on (Settings) and some voice exists on this computer. */
export async function storyVoicesReady(): Promise<boolean> {
  if (!getA11y().storyVoices) return false;
  const s = await voiceStatus();
  return s.human || s.natural;
}

const CACHE = new Map<string, Promise<Clip | null>>();
const LIMIT = 90;

async function load(text: string, role: VoiceRole, rate: number): Promise<Clip | null> {
  try {
    const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice: role, rate }) });
    if (!r.ok) return null;
    const url = URL.createObjectURL(await r.blob());
    const ms = await new Promise<number>((resolve) => {
      const a = new Audio(url);
      a.preload = "metadata";
      a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? Math.round(a.duration * 1000) : 0);
      a.onerror = () => resolve(0);
      window.setTimeout(() => resolve(0), 3000);                  // never wait forever for metadata
    });
    return { url, ms };
  } catch { return null; }
}

/** Fetches (or reuses) the clip for a line. Safe to call early, to have it ready: calling it twice never fetches twice. */
export function getClip(text: string, role: VoiceRole, rate = getA11y().speechRate): Promise<Clip | null> {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 690);
  if (!clean) return Promise.resolve(null);
  const key = `${role}|${rate}|${clean}`;
  let p = CACHE.get(key);
  if (!p) {
    p = storyVoicesReady().then((ok) => (ok ? load(clean, role, rate) : null));
    CACHE.set(key, p);
    if (CACHE.size > LIMIT) {
      const old = CACHE.keys().next().value as string;
      CACHE.get(old)?.then((c) => c && URL.revokeObjectURL(c.url), () => undefined);
      CACHE.delete(old);
    }
  }
  return p;
}

/** How long a line takes to read when there is no voice. */
export const readingMs = (text: string, min = 2200): number => Math.max(min, text.split(/\s+/).length * 330);

export interface Playing { done: Promise<void>; stop: () => void; mouth: () => number }
let current: Playing | null = null;
let ctx: AudioContext | null = null;

/** Plays a clip; `done` resolves when it ends (or is stopped). `mouth()` is 0..1, measured from the audio, for a speaking figure. */
export function playClip(clip: Clip): Playing {
  stopSpeaking();                                              // the read-aloud feature never talks over a story voice
  current?.stop();
  const el = new Audio(clip.url);
  let an: AnalyserNode | null = null;
  let buf: Uint8Array<ArrayBuffer> | null = null;
  try {
    if (typeof AudioContext !== "undefined") {
      ctx ??= new AudioContext();
      an = ctx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.3;
      buf = new Uint8Array(an.fftSize);
      const src = ctx.createMediaElementSource(el);
      src.connect(an); an.connect(ctx.destination);
      void ctx.resume();
    }
  } catch { an = null; }
  let smooth = 0;
  const mouth = () => {
    let open = 0;
    if (an && buf && !el.paused) {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      open = Math.min(1, Math.sqrt(sum / buf.length) * 5);
    } else if (!el.paused) {
      open = 0.4 + 0.4 * Math.sin(performance.now() / 70);
    }
    smooth += (open - smooth) * (open > smooth ? 0.6 : 0.3);
    return smooth < 0.05 ? 0 : smooth;
  };
  let finish: () => void = () => undefined;
  const done = new Promise<void>((resolve) => { finish = resolve; });
  const stop = () => { el.pause(); finish(); if (current === playing) current = null; };
  el.onended = () => { finish(); if (current === playing) current = null; };
  el.onerror = () => { finish(); if (current === playing) current = null; };
  const playing: Playing = { done, stop, mouth };
  current = playing;
  el.play().catch(() => finish());
  return playing;
}

export const stopVoice = (): void => { current?.stop(); current = null; };
