// Instrument-spezifische Konfiguration und Lehrplan fuer das Klavier.
// Ein weiteres Instrument (z. B. Gitarre) waere spaeter nur ein weiterer Ordner
// nach demselben Muster: Konfig + Layout + Lehrplan-Daten.

export const piano = {
  id: "piano",
  name: "Klavier",
  emoji: "🎹",
  layout: "keyboard",
  // Zwei Oktaven rund um das mittlere C. Bewusst kompakt gehalten, damit die
  // Tasten auf dem Handy breit und gut treffbar sind (nicht das ganze Klavier).
  lowestMidi: 48, // C3
  highestMidi: 72, // C5
  centerMidi: 60, // mittleres C
};

// Lehrplan "Noten lesen": Landmark-Noten zuerst, dann Nachbarn.
// Nur weisse Tasten, alle innerhalb C3 bis C5, gemischt Violin- und Bassschluessel.
const T = (m) => ({ id: `treble:${m}`, midi: m, clef: "treble" });
const B = (m) => ({ id: `bass:${m}`, midi: m, clef: "bass" });

export const noteCurriculum = [
  // Violinschluessel, rund ums mittlere C
  T(60), // mittleres C (C4), zentrale Landmark
  T(67), // G4, Landmark auf der Violinschluessel-Linie
  T(64), // E4, unterste Linie
  T(71), // H4/B4, Mittellinie
  T(65), // F4
  T(69), // A4
  T(62), // D4
  T(72), // C5
  // Bassschluessel
  B(53), // F3, Landmark auf der Bassschluessel-Linie
  B(50), // D3, Mittellinie
  B(48), // C3
  B(55), // G3
  B(57), // A3
  B(52), // E3
  B(59), // H3/B3
  B(60), // mittleres C im Bassschluessel
];
