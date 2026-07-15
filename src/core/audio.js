// Klang-Engine auf Basis der Web Audio API. Keine Abhaengigkeiten, laeuft offline.
// Klavieraehnlicher Ton per additiver Synthese: Grundton plus mehrere Obertoene
// mit abfallender Lautstaerke, schneller Anschlag, dann weiches Ausklingen, plus
// ein Tiefpass, der ueber die Zeit dunkler wird. Klingt deutlich natuerlicher als
// ein einzelner Oszillator. (Sampled Steinway ueber smplr ist spaeter nachruestbar.)
import { midiFreq } from "./theory.js";

let ctx = null;
let master = null;

// AudioContext startet erst nach echter Nutzer-Geste (Pflicht auf iOS).
export function ensureAudio() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  return ctx;
}

// relative Lautstaerke der Obertoene 1..7 (klavieraehnliches Spektrum)
const PARTIALS = [1, 0.55, 0.4, 0.28, 0.16, 0.09, 0.05];

// Hook, damit die Mikrofon-Erkennung die eigenen Toene der App ignorieren kann.
let playHook = null;
export function setPlayHook(fn) {
  playHook = fn;
}

export function playNote(midi, { velocity = 0.85, duration } = {}) {
  const c = ensureAudio();
  const now = c.currentTime;
  const freq = midiFreq(midi);
  // tiefe Toene klingen laenger nach als hohe
  const dur = duration || Math.max(0.9, 2.6 - (midi - 36) * 0.02);
  if (playHook) playHook(midi, dur);

  const voice = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.setValueAtTime(Math.min(11000, freq * 8), now);
  filt.frequency.exponentialRampToValueAtTime(Math.max(700, freq * 2.2), now + dur);
  filt.Q.value = 0.4;
  voice.connect(filt);
  filt.connect(master);

  // Huellkurve der Gesamtstimme: sehr schneller Anschlag, dann exponentielles Ausklingen
  const peak = 0.22 * velocity;
  voice.gain.setValueAtTime(0.0001, now);
  voice.gain.linearRampToValueAtTime(peak, now + 0.005);
  voice.gain.exponentialRampToValueAtTime(peak * 0.3, now + 0.35);
  voice.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  const oscs = [];
  PARTIALS.forEach((amp, i) => {
    const n = i + 1;
    const o = c.createOscillator();
    o.type = "sine";
    // leichte Verstimmung der Obertoene fuer mehr Waerme (Inharmonizitaet)
    o.frequency.value = freq * n * (1 + i * 0.0006);
    const g = c.createGain();
    g.gain.value = amp;
    o.connect(g);
    g.connect(voice);
    o.start(now);
    o.stop(now + dur + 0.05);
    oscs.push(o);
  });

  // kurzer Anschlags-"Klopfer" fuer mehr Attack
  const thump = c.createOscillator();
  thump.type = "triangle";
  thump.frequency.value = freq;
  const tg = c.createGain();
  tg.gain.setValueAtTime(0.12 * velocity, now);
  tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  thump.connect(tg);
  tg.connect(filt);
  thump.start(now);
  thump.stop(now + 0.08);
}

// Metronom-Klick fuer spaetere Rhythmus-Module.
export function playClick(accent = false) {
  const c = ensureAudio();
  const now = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.value = accent ? 1600 : 1100;
  o.connect(g);
  g.connect(master);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.18, now + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  o.start(now);
  o.stop(now + 0.06);
}
