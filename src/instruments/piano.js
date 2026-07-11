// Instrument-spezifische Konfiguration und Lehrplan fuer das Klavier.
// Ein weiteres Instrument (z. B. Gitarre) waere spaeter nur ein weiterer Ordner
// nach demselben Muster: Konfig + Layout + Lehrplan-Daten.

export const piano = {
  id: "piano",
  name: "Klavier",
  layout: "keyboard",
  lowestMidi: 48, // C3
  highestMidi: 84, // C6, guter sichtbarer Bereich fuers Handy
};

// Lehrplan "Noten lesen": Landmark-Noten zuerst, dann Nachbarn.
// Nur weisse Tasten, gemischt Violin- und Bassschluessel, aber gestaffelt
// (der Scheduler fuehrt neue Noten nur langsam ein).
const T = (m) => ({ id: `treble:${m}`, midi: m, clef: "treble" });
const B = (m) => ({ id: `bass:${m}`, midi: m, clef: "bass" });

export const noteCurriculum = [
  T(60), // mittleres C (C4), zentrale Landmark
  T(67), // G4, Landmark im Violinschluessel
  T(64), // E4, unterste Linie
  T(71), // H4/B4, Mittellinie
  T(65), // F4
  T(69), // A4
  T(72), // C5
  T(62), // D4
  T(74), // D5
  T(77), // F5, oberste Linie
  B(53), // F3, Landmark im Bassschluessel
  B(50), // D3, Mittellinie
  B(57), // A3
  B(55), // G3
  B(60), // mittleres C im Bassschluessel
  B(48), // C3
];
