// Klang-Engine auf Basis der Web Audio API. Keine Abhaengigkeiten, laeuft offline.
// Ein waermerer, klavieraehnlicher Ton aus zwei Oszillatoren mit Huellkurve.
// Sampled Steinway-Klang (smplr) kann spaeter hier nachgeruestet werden.
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
  master.gain.value = 0.85;
  master.connect(ctx.destination);
  return ctx;
}

export function playNote(midi, { velocity = 0.8, duration = 1.2 } = {}) {
  const c = ensureAudio();
  const now = c.currentTime;
  const freq = midiFreq(midi);

  const g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = Math.min(9000, freq * 6);

  const o1 = c.createOscillator();
  o1.type = "triangle";
  o1.frequency.value = freq;
  const o2 = c.createOscillator();
  o2.type = "sine";
  o2.frequency.value = freq * 2;
  const o2g = c.createGain();
  o2g.gain.value = 0.22;

  o1.connect(g);
  o2.connect(o2g);
  o2g.connect(g);
  g.connect(filt);
  filt.connect(master);

  const peak = 0.3 * velocity;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(peak, now + 0.006);
  g.gain.exponentialRampToValueAtTime(peak * 0.55, now + 0.16);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  o1.start(now);
  o2.start(now);
  o1.stop(now + duration + 0.05);
  o2.stop(now + duration + 0.05);
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
