/** Calm, generated sound: slow ambient pads for music, soft chimes for effects. Nothing is loaded from files, nothing is loud, and nothing is needed to play (every cue also has a visual one).
 *  Music has a gentle mood per simulation. Both music and effects can be turned off or down; settings are kept on this computer. */
export type Mood = "hub" | "covid" | "bhopal" | "blackout";
export type Sfx = "click" | "select" | "confirm" | "good" | "neutral" | "bad" | "open";
export interface AudioSettings { music: boolean; musicVolume: number; sfx: boolean; sfxVolume: number }

export const AUDIO_KEY = "rl.audio";
const DEFAULTS: AudioSettings = { music: true, musicVolume: 0.35, sfx: true, sfxVolume: 0.5 };
const clamp = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(1, v)) : d);

function load(): AudioSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(AUDIO_KEY) ?? "null") as Partial<AudioSettings> | null;
    if (raw) return { music: raw.music !== false, sfx: raw.sfx !== false, musicVolume: clamp(raw.musicVolume, DEFAULTS.musicVolume), sfxVolume: clamp(raw.sfxVolume, DEFAULTS.sfxVolume) };
  } catch { /* unreadable: use the defaults */ }
  return { ...DEFAULTS };
}

// frequencies (Hz) of each mood's scale: low and soft, always consonant, so any note over any other is pleasant
const MOODS: Record<Mood, { notes: number[]; bells: number[]; period: number; drone?: number }> = {
  hub:      { notes: [130.8, 164.8, 196.0, 220.0, 261.6, 293.7, 329.6], bells: [659.3, 784.0, 880.0], period: 5200 },                  // C major pentatonic: open, welcoming
  covid:    { notes: [174.6, 220.0, 261.6, 329.6, 392.0, 440.0, 493.9], bells: [698.5, 880.0, 987.8], period: 5000 },                  // F lydian: warm, hopeful
  bhopal:   { notes: [146.8, 174.6, 196.0, 220.0, 261.6, 293.7], bells: [587.3, 698.5], period: 7000 },                                  // D minor pentatonic: sparse, serious, never bleak
  blackout: { notes: [110.0, 130.8, 146.8, 164.8, 196.0, 220.0, 261.6], bells: [440.0, 659.3], period: 6200, drone: 55.0 },             // A minor pentatonic with a soft low drone
};

type Listener = () => void;

class Engine {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private send: GainNode | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private drone: { stop: () => void } | null = null;
  private mood: Mood = "hub";
  private playing = false;
  private settings: AudioSettings = load();
  private listeners = new Set<Listener>();
  private armed = false;

  get supported(): boolean { return typeof window !== "undefined" && typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) !== "undefined"; }
  getSettings = (): AudioSettings => this.settings;
  subscribe = (l: Listener): (() => void) => { this.listeners.add(l); return () => this.listeners.delete(l); };

  update(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch, musicVolume: clamp(patch.musicVolume ?? this.settings.musicVolume, DEFAULTS.musicVolume), sfxVolume: clamp(patch.sfxVolume ?? this.settings.sfxVolume, DEFAULTS.sfxVolume) };
    try { localStorage.setItem(AUDIO_KEY, JSON.stringify(this.settings)); } catch { /* ignore */ }
    this.apply();
    this.listeners.forEach((l) => l());
  }

  /** Quick mute: if anything is on, turn everything off; otherwise turn everything on. */
  toggleAll(): void { const on = this.settings.music || this.settings.sfx; this.update({ music: !on, sfx: !on }); }

  setMood(m: Mood): void { if (m === this.mood) return; this.mood = m; if (this.playing) { this.stopDrone(); this.startDrone(); } }

  /** Starts the music if it is on. Browsers (and the desktop shell) may need a first click before sound is allowed, so this is called again on the first gesture. */
  start(): void {
    if (!this.supported) return;
    this.ensure();
    this.arm();
    this.apply();
  }

  sfx(name: Sfx): void {
    if (!this.supported || !this.settings.sfx) return;
    const c = this.ensure(); if (!c || !this.sfxBus) return;
    if (c.state === "suspended") void c.resume();
    const t = c.currentTime;
    const tone = (f: number, at: number, dur: number, level: number, type: OscillatorType = "sine", glide?: number) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t + at); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + at + dur);
      g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(level, t + at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g); g.connect(this.sfxBus!); o.start(t + at); o.stop(t + at + dur + 0.05);
    };
    switch (name) {
      case "click": tone(560, 0, 0.07, 0.05); break;
      case "select": tone(392, 0, 0.11, 0.06, "triangle", 523); break;
      case "confirm": tone(523.3, 0, 0.22, 0.07); tone(784, 0.09, 0.3, 0.06); break;
      case "good": tone(523.3, 0, 0.3, 0.07); tone(659.3, 0.11, 0.3, 0.06); tone(784, 0.22, 0.5, 0.06); break;
      case "neutral": tone(392, 0, 0.45, 0.06); tone(440, 0.14, 0.4, 0.04); break;
      case "bad": tone(262, 0, 0.5, 0.06, "triangle"); tone(220, 0.2, 0.7, 0.05, "triangle"); break;     // soft and low, never alarming
      case "open": tone(659.3, 0, 0.5, 0.05); tone(987.8, 0.1, 0.6, 0.035); break;
    }
  }

  // ------------------------------------------------------------------------------------------------------------ internals
  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    try {
      const c = new Ctor();
      this.musicBus = c.createGain(); this.sfxBus = c.createGain(); this.send = c.createGain();
      // a soft echo gives the pads their space
      const delay = c.createDelay(2); delay.delayTime.value = 0.52;
      const fb = c.createGain(); fb.gain.value = 0.38;
      const tone = c.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 1500;
      this.send.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(this.musicBus);
      this.musicBus.connect(c.destination); this.sfxBus.connect(c.destination);
      this.ctx = c;
    } catch { this.ctx = null; }
    return this.ctx;
  }

  private arm(): void {
    if (this.armed || typeof document === "undefined") return;
    this.armed = true;
    const go = () => { if (this.ctx?.state === "suspended") void this.ctx.resume(); document.removeEventListener("pointerdown", go); document.removeEventListener("keydown", go); };
    document.addEventListener("pointerdown", go); document.addEventListener("keydown", go);
    document.addEventListener("visibilitychange", () => { if (!this.ctx) return; if (document.hidden) void this.ctx.suspend(); else if (this.settings.music || this.settings.sfx) void this.ctx.resume(); });
  }

  private ducked = false;
  /** Lets a voice be heard: the music sits low while someone is speaking, then comes back. Not saved as a setting. */
  duck(on: boolean): void { this.ducked = on; this.apply(); }

  private apply(): void {
    if (!this.ctx || !this.musicBus || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t); this.musicBus.gain.linearRampToValueAtTime(this.settings.music ? this.settings.musicVolume * 0.24 * (this.ducked ? 0.3 : 1) : 0, t + (this.ducked ? 0.5 : 1.2));
    this.sfxBus.gain.cancelScheduledValues(t); this.sfxBus.gain.setValueAtTime(this.settings.sfxVolume * 0.9, t);
    if (this.settings.music && !this.playing) { this.playing = true; if (this.ctx.state === "suspended") void this.ctx.resume(); this.startDrone(); this.tick(); }
    if (!this.settings.music && this.playing) { this.playing = false; this.stopDrone(); if (this.timer) clearTimeout(this.timer); this.timer = null; }
  }

  private tick(): void {
    if (!this.playing || !this.ctx) return;
    const m = MOODS[this.mood];
    const n = 1 + (Math.random() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) this.pad(m.notes[Math.floor(Math.random() * m.notes.length)], 9 + Math.random() * 5, 0.5 + Math.random() * 0.4);
    if (Math.random() < 0.42) this.bell(m.bells[Math.floor(Math.random() * m.bells.length)], 0.8 + Math.random() * 2);
    this.timer = setTimeout(() => this.tick(), m.period * (0.8 + Math.random() * 0.5));
  }

  private pad(f: number, dur: number, level: number): void {
    const c = this.ctx!, t = c.currentTime;
    const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(level * 0.5, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const oscs = [0, 4, -4].map((cents, i) => { const o = c.createOscillator(); o.type = i === 0 ? "sine" : "triangle"; o.frequency.value = f; o.detune.value = cents; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); return o; });
    void oscs; lp.connect(g); g.connect(this.musicBus!); g.connect(this.send!);
  }

  private bell(f: number, delay: number): void {
    const c = this.ctx!, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
    o.connect(g); g.connect(this.musicBus!); g.connect(this.send!); o.start(t); o.stop(t + 4.6);
  }

  private startDrone(): void {
    const d = MOODS[this.mood].drone; if (!d || !this.ctx || !this.playing) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = d;
    g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(0.35, c.currentTime + 4);
    o.connect(g); g.connect(this.musicBus!); o.start();
    this.drone = { stop: () => { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.linearRampToValueAtTime(0.0001, t + 2.5); o.stop(t + 2.6); } };
  }
  private stopDrone(): void { this.drone?.stop(); this.drone = null; }
}

export const audio = new Engine();
