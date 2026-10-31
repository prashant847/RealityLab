import { chunkText, fetchPiece, naturalVoiceReady, stopSpeaking } from "../a11y/speak";
import { getA11y } from "../a11y/a11y";
import { audio } from "../audio/audio";
import { spoken, type Scene } from "./script";

export interface NarratorState { scene: number; line: number; playing: boolean; ended: boolean; engine: "natural" | "browser" | "timed" | "starting" }
export interface Mouth { open: number; wide: number }

interface Unit { scene: number; line: number; text: string; caption: string }

export type Lang = "en" | "hi";
const BEAT = 900;                                  // a breath between scenes
const LINE_GAP = 380;                              // and a pause between lines, so each one lands
/** Deep but calm, not menacing: a small drop in pitch, a gentle low warmth, nothing harsh, and an unhurried pace. Hindi is a touch deeper because its voice starts higher. */
const DEPTH: Record<Lang, number> = { en: 0.98, hi: 0.93 };   // played back slightly slower with the pitch allowed to drop (English barely, about a third of a semitone)
const TEMPO = 0.9;                                 // and spoken a little slower than normal, unhurried
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** The voice of each language: English is the deep British voice (about 97 Hz), Hindi the deep Hindi male voice (about 108 Hz). */
export const ARCHIVIST_VOICE: Record<Lang, string> = { en: "male", hi: "hindi" };

/**
 * Plays a debrief scene by scene. The voice is the offline natural voice when it is installed, otherwise the computer's own voice, otherwise a
 * silent timed read with captions. `mouth()` reports how open the speaker's mouth should be right now, measured from the real audio.
 */
export class Narrator {
  private state: NarratorState = { scene: 0, line: 0, playing: false, ended: false, engine: "starting" };
  private listeners = new Set<() => void>();
  private units: Unit[] = [];
  private firstOf: number[] = [];
  private cursor = 0;
  private token = 0;
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private td: Uint8Array<ArrayBuffer> | null = null;
  private fd: Uint8Array<ArrayBuffer> | null = null;
  private speakingSince = 0;
  private synthSpeaking = false;
  private wired = new WeakSet<HTMLAudioElement>();
  private smooth = 0;
  private prefetch = new Map<number, Promise<string>>();
  rate = 1;

  constructor(readonly scenes: Scene[], readonly lang: Lang = "en") {
    scenes.forEach((s, si) => {
      this.firstOf[si] = this.units.length;
      s.lines.forEach((line, li) => chunkText(spoken(line)).forEach((text, ci) => this.units.push({ scene: si, line: li, text, caption: ci === 0 ? line : "" })));
    });
  }

  getState = (): NarratorState => this.state;
  subscribe = (l: () => void): (() => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  private set(patch: Partial<NarratorState>): void {
    this.state = { ...this.state, ...patch };
    if ("playing" in patch) audio.duck(this.state.playing);
    this.listeners.forEach((l) => l());
  }

  /** 0..1 open and 0..1 wide, smoothed. Natural voice: measured from the audio. Other voices: a gentle syllable rhythm while speaking. */
  mouth(): Mouth {
    let open = 0, wide = 0.5;
    if (this.analyser && this.td && this.fd && this.audio && !this.audio.paused) {
      this.analyser.getByteTimeDomainData(this.td);
      let sum = 0;
      for (let i = 0; i < this.td.length; i++) { const v = (this.td[i] - 128) / 128; sum += v * v; }
      open = Math.min(1, Math.sqrt(sum / this.td.length) * 5.2);
      this.analyser.getByteFrequencyData(this.fd);
      let num = 0, den = 0;
      for (let i = 1; i < this.fd.length; i++) { num += i * this.fd[i]; den += this.fd[i]; }
      wide = den > 0 ? Math.min(1, Math.max(0, (num / den - 6) / 26)) : 0.5;      // bright sounds (ee) = wide, dark sounds (oo) = round
    } else if (this.synthSpeaking || (this.state.engine === "timed" && this.state.playing)) {
      const t = (performance.now() - this.speakingSince) / 1000;
      open = Math.max(0, 0.35 + 0.35 * Math.sin(t * 13) + 0.2 * Math.sin(t * 5.3 + 1)) * (0.6 + 0.4 * Math.sin(t * 1.7) ** 2);
      wide = 0.5 + 0.4 * Math.sin(t * 4.1);
    }
    this.smooth += (open - this.smooth) * (open > this.smooth ? 0.6 : 0.3);
    return { open: this.smooth < 0.04 ? 0 : this.smooth, wide };
  }

  // ---------------------------------------------------------------- controls
  play(): void {
    if (this.state.playing) return;
    stopSpeaking();                                                       // the read-aloud feature and the Archivist never talk over each other
    if (this.state.ended) { this.cursor = 0; this.set({ ended: false, scene: 0, line: 0 }); }
    this.set({ playing: true });
    if (this.audio && this.audio.paused && this.audio.currentTime > 0 && !this.audio.ended) { void this.ctx?.resume(); void this.audio.play().catch(() => undefined); return; }
    if (this.synthSpeaking && typeof speechSynthesis !== "undefined") { speechSynthesis.resume(); return; }
    void this.run(++this.token);
  }
  pause(): void {
    if (!this.state.playing) return;
    this.set({ playing: false });
    this.audio?.pause();
    if (this.synthSpeaking && typeof speechSynthesis !== "undefined") speechSynthesis.pause();
  }
  toggle(): void { if (this.state.playing) this.pause(); else this.play(); }
  goto(scene: number): void {
    const s = Math.max(0, Math.min(this.scenes.length - 1, scene));
    this.halt();
    this.cursor = this.firstOf[s];
    this.set({ scene: s, line: 0, ended: false });
    if (this.state.playing) { this.set({ playing: true }); void this.run(++this.token); }
  }
  next(): void { this.goto(this.state.scene + 1); }
  prev(): void { this.goto(this.state.scene > 0 && this.cursor - this.firstOf[this.state.scene] < 2 ? this.state.scene - 1 : this.state.scene); }
  destroy(): void { audio.duck(false); this.halt(); this.listeners.clear(); void this.ctx?.close().catch(() => undefined); this.ctx = null; this.analyser = null; }

  private halt(): void {
    this.token++;
    this.clearPrefetch();
    this.synthSpeaking = false;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    if (this.audio) { const a = this.audio; this.audio = null; a.pause(); }
  }

  private clearPrefetch(): void {
    for (const p of this.prefetch.values()) p.then((u) => URL.revokeObjectURL(u), () => undefined);
    this.prefetch.clear();
  }

  // ---------------------------------------------------------------- playback loop
  private fetchUnit(i: number): Promise<string> {
    const hit = this.prefetch.get(i);
    if (hit) return hit;
    const tempo = getA11y().speechRate * this.rate * TEMPO;
    const p = fetchPiece(this.units[i].text, ARCHIVIST_VOICE[this.lang], Math.max(0.5, Math.min(2, tempo / DEPTH[this.lang])));   // generated faster, because it is played back slower
    p.catch(() => undefined);
    this.prefetch.set(i, p);
    return p;
  }

  /** The Archivist's voice chain: measure the mouth first, then weight the low end, darken the top, even out the dynamics and place it in a stone hall. */
  private wire(el: HTMLAudioElement): void {
    if (typeof AudioContext === "undefined" || this.wired.has(el)) return;
    try {
      const ctx = (this.ctx ??= new AudioContext());
      if (!this.analyser) {
        const an = (this.analyser = ctx.createAnalyser()); an.fftSize = 1024; an.smoothingTimeConstant = 0.35;
        this.td = new Uint8Array(an.fftSize); this.fd = new Uint8Array(an.frequencyBinCount);
        const low = ctx.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 200; low.gain.value = 2.5;
        const body = ctx.createBiquadFilter(); body.type = "peaking"; body.frequency.value = 3200; body.Q.value = 0.8; body.gain.value = -1.5;   // takes the edge off the consonants
        const dark = ctx.createBiquadFilter(); dark.type = "highshelf"; dark.frequency.value = 5500; dark.gain.value = -2;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -28; comp.knee.value = 24; comp.ratio.value = 1.8; comp.attack.value = 0.01; comp.release.value = 0.25;
        const dry = ctx.createGain(); dry.gain.value = 0.85;
        const hall = ctx.createConvolver(); hall.buffer = impulse(ctx, 1.7);
        const wet = ctx.createGain(); wet.gain.value = 0.06;
        const master = ctx.createGain(); master.gain.value = 1;
        const limit = ctx.createDynamicsCompressor(); limit.threshold.value = -6; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.002; limit.release.value = 0.12;
        an.connect(low); low.connect(body); body.connect(dark); dark.connect(comp); comp.connect(dry); dry.connect(master);
        comp.connect(hall); hall.connect(wet); wet.connect(master); master.connect(limit); limit.connect(ctx.destination);
      }
      ctx.createMediaElementSource(el).connect(this.analyser);
      this.wired.add(el);
      void ctx.resume();
    } catch { /* no analysis or effects available: plain playback, and the mouth falls back to a rhythm */ }
  }

  private async run(mine: number): Promise<void> {
    const natural = await naturalVoiceReady();
    if (mine !== this.token) return;
    let engine: NarratorState["engine"] = natural ? "natural" : typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined" ? "browser" : "timed";
    this.set({ engine });
    while (this.cursor < this.units.length) {
      if (mine !== this.token) return;
      const i = this.cursor, u = this.units[i];
      if (i > 0 && this.units[i - 1].scene !== u.scene) { this.set({ scene: u.scene, line: 0 }); await sleep(BEAT); if (mine !== this.token) return; }
      this.set({ scene: u.scene, line: u.line });
      this.speakingSince = performance.now();
      let ok = false;
      if (engine === "natural") {
        try {
          const url = await this.fetchUnit(i);
          if (mine !== this.token) return;
          if (i + 1 < this.units.length) void this.fetchUnit(i + 1);
          try { await this.playUrl(url, mine); } finally { URL.revokeObjectURL(url); this.prefetch.delete(i); }
          ok = true;
        } catch { engine = typeof speechSynthesis !== "undefined" ? "browser" : "timed"; if (mine === this.token) this.set({ engine }); }
      }
      if (!ok && engine === "browser") { try { await this.sayWithBrowser(u.text, mine); ok = true; } catch { engine = "timed"; if (mine === this.token) this.set({ engine }); } }
      if (!ok && engine === "timed") await this.waitTimed(u.text, mine);
      if (mine !== this.token) return;
      this.prefetch.delete(i);
      this.cursor = i + 1;
      const nx = this.units[i + 1];
      if (nx && nx.scene === u.scene && nx.line !== u.line) { await sleep(LINE_GAP); if (mine !== this.token) return; }
    }
    if (mine === this.token) { this.set({ playing: false, ended: true }); }
  }

  private playUrl(url: string, mine: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const el = new Audio(url);
      el.preservesPitch = false;                                          // slowing the playback lowers the pitch, as for a bigger, older voice
      el.playbackRate = DEPTH[this.lang];
      this.audio = el;
      this.wire(el);
      const done = () => { if (this.audio === el) this.audio = null; };
      el.onended = () => { done(); resolve(); };
      el.onerror = () => { done(); reject(new Error("playback failed")); };
      el.onpause = () => { if (mine !== this.token) { done(); resolve(); } };
      el.play().catch((e) => { done(); reject(e); });
    });
  }

  private sayWithBrowser(text: string, mine: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const synth = speechSynthesis;
      synth.cancel();
      setTimeout(() => {
        if (mine !== this.token) { resolve(); return; }
        const u = new SpeechSynthesisUtterance(text);
        u.rate = Math.max(0.5, getA11y().speechRate * this.rate * TEMPO); u.pitch = 0.4;
        if (this.lang === "hi") u.lang = "hi-IN";
        const voice = (synth.getVoices?.() ?? []).find((v) => v.lang.toLowerCase().startsWith(this.lang === "hi" ? "hi" : "en"));
        if (voice) { u.voice = voice; u.lang = voice.lang; }
        u.onstart = () => { this.synthSpeaking = true; this.speakingSince = performance.now(); };
        u.onend = () => { this.synthSpeaking = false; resolve(); };
        u.onerror = (e) => { this.synthSpeaking = false; if ((e as SpeechSynthesisErrorEvent).error === "canceled" || (e as SpeechSynthesisErrorEvent).error === "interrupted") resolve(); else reject(new Error("speech failed")); };
        synth.speak(u);
      }, 80);
    });
  }

  private async waitTimed(text: string, mine: number): Promise<void> {
    const end = Date.now() + Math.max(1400, (text.split(/\s+/).length / 2.7) * 1000 / (this.rate || 1));
    while (Date.now() < end) {
      if (mine !== this.token) return;
      await sleep(120);
      if (!this.state.playing) { while (!this.state.playing && mine === this.token) await sleep(150); }
    }
  }
}

/** A short, dark hall: decaying noise, so the voice sounds as if spoken in a stone library. */
function impulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  let seed = 12345;
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) { seed = (seed * 1664525 + 1013904223) % 4294967296; d[i] = ((seed / 4294967296) * 2 - 1) * Math.pow(1 - i / n, 3.2); }
  }
  return buf;
}
