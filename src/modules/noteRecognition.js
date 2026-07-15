// Lernmodul "Taste kennt ihre Note".
// Zwei Aufgabentypen, beide mit echtem Tastenspiel als Antwort (Retrieval statt Ankreuzen):
//   read: Note steht im System, richtige Taste druecken (Klang vor Zeichen: Antwort klingt).
//   ear:  Ton erklingt, dieselbe Taste finden (Gehoer).
import { renderNote } from "../core/notation.js";
import { noteLabel } from "../core/theory.js";
import { playNote } from "../core/audio.js";

export function makeReadTask(entry, naming) {
  return {
    kind: "read",
    entry,
    targetMidi: entry.midi,
    prompt: "Spiel diese Note am Klavier",
    label: noteLabel(entry.midi, naming),
    render(container) {
      container.innerHTML = "";
      container.appendChild(renderNote(entry.midi, entry.clef));
    },
    check(midi) {
      return midi === entry.midi;
    },
    reveal() {
      playNote(entry.midi);
    },
  };
}

export function makeEarTask(entry, naming) {
  return {
    kind: "ear",
    entry,
    targetMidi: entry.midi,
    prompt: "Spiele den Ton, den du hoerst",
    label: noteLabel(entry.midi, naming),
    render(container) {
      container.innerHTML = "";
      const btn = document.createElement("button");
      btn.className = "ear-play";
      btn.type = "button";
      btn.textContent = "▶  Ton nochmal hoeren";
      btn.addEventListener("click", () => playNote(entry.midi));
      container.appendChild(btn);
      // Ton beim Erscheinen einmal abspielen (leicht verzoegert).
      setTimeout(() => playNote(entry.midi), 250);
    },
    check(midi) {
      return midi === entry.midi;
    },
    reveal() {
      playNote(entry.midi);
    },
  };
}
