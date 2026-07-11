// Musiktheorie-Helfer, instrument-unabhaengig fuer Tasteninstrumente.
// MIDI-Standard: 60 = mittleres C (C4).

export const LETTERS_INT = ["C", "D", "E", "F", "G", "A", "B"];
export const LETTERS_DE = ["C", "D", "E", "F", "G", "A", "H"];

// Tonhoehenklasse (0..11) einer weissen Taste -> Buchstabenindex 0..6
const PC_TO_LETTER = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
const WHITE_PC = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PC = [1, 3, 6, 8, 10];

export function isWhite(midi) {
  return WHITE_PC.includes(midi % 12);
}
export function isBlack(midi) {
  return BLACK_PC.includes(midi % 12);
}
export function midiToOctave(midi) {
  return Math.floor(midi / 12) - 1; // 60 -> 4
}
export function letterIndex(midi) {
  return PC_TO_LETTER[midi % 12];
}

export function noteName(midi, naming = "de") {
  const letters = naming === "de" ? LETTERS_DE : LETTERS_INT;
  const li = letterIndex(midi);
  if (li === undefined) return null; // schwarze Taste, hier nicht benutzt
  return letters[li];
}
export function noteLabel(midi, naming = "de") {
  const n = noteName(midi, naming);
  return n ? n + midiToOctave(midi) : null;
}

// Diatonische Nummer fuer die vertikale Position im Notensystem (nur weisse Tasten).
export function diatonicNumber(midi) {
  const li = letterIndex(midi);
  return midiToOctave(midi) * 7 + li;
}

export function midiFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
