// Vereinheitlichte Noten-Eingabe: Touch-Klaviatur UND echtes MIDI-Keyboard
// laufen durch dieselbe Schnittstelle. So bleibt der Lernkern quellen-unabhaengig.
// Hinweis: Web MIDI gibt es auf dem iPhone nicht, dort ist die Touch-Klaviatur der Weg.
import { playNote } from "./audio.js";

const listeners = new Set();

export function onNote(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Zentrale Stelle: spielt den Klang und meldet die Note an alle Zuhoerer.
export function feedNote(midi, velocity = 0.8, source = "touch") {
  playNote(midi, { velocity });
  for (const cb of listeners) cb({ midi, velocity, source });
}

let midiEnabled = false;
export function isMidiEnabled() {
  return midiEnabled;
}

export async function initMidi(onStatus) {
  if (!navigator.requestMIDIAccess) {
    onStatus && onStatus("nicht unterstuetzt (z. B. iPhone)");
    return false;
  }
  try {
    const access = await navigator.requestMIDIAccess();
    const bind = (input) => {
      input.onmidimessage = (msg) => {
        const [status, note, vel] = msg.data;
        if ((status & 0xf0) === 0x90 && vel > 0) {
          feedNote(note, vel / 127, "midi");
        }
      };
    };
    access.inputs.forEach(bind);
    access.onstatechange = (e) => {
      if (e.port.type === "input" && e.port.state === "connected") bind(e.port);
    };
    midiEnabled = true;
    onStatus && onStatus(access.inputs.size > 0 ? "Keyboard verbunden" : "bereit, kein Geraet");
    return true;
  } catch (err) {
    onStatus && onStatus("kein Zugriff erlaubt");
    return false;
  }
}
