// Zeichnet eine Note auf ein grosses, klares System aus Violin- UND Bassschluessel
// (Grand Staff), im Stil einer Klavier-Lern-App. Bewusst echte Notation, keine
// Fingerzahlen und keine Farbpunkte: das Ziel ist direktes Noten-Lesen.
import { diatonicNumber } from "./theory.js";

const SVGNS = "http://www.w3.org/2000/svg";
function mk(name, attrs = {}) {
  const el = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Ein durchgehendes y-Raster ueber beide Systeme, damit alles zusammenpasst.
// Bezug: mittleres C (diatonische Nummer 28) liegt genau zwischen den Systemen.
const MID_C = 28;
const HALF = 13; // halber Linienabstand = ein diatonischer Schritt
const W = 1000;
const H = 440;
const CENTER_Y = H / 2;
const X_LEFT = 44;
const X_RIGHT = W - 30;

const TREBLE_LINES = [30, 32, 34, 36, 38]; // E4 G4 H4 D5 F5
const BASS_LINES = [18, 20, 22, 24, 26]; // G2 B2 D3 F3 A3

function y(dia) {
  return CENTER_Y - (dia - MID_C) * HALF;
}

export function renderNote(midi, clef = "treble") {
  const svg = mk("svg", {
    viewBox: `0 0 ${W} ${H}`,
    class: "staff grand",
    preserveAspectRatio: "xMidYMid meet",
  });

  // Ein durchgehender heller Panel-Hintergrund hinter dem GESAMTEN System, damit
  // auch das mittlere C im Spalt zwischen den Systemen dunkel auf hell und damit
  // klar erkennbar ist. Danach die fuenf Linien je System darueber.
  const panelTop = y(38) - 26;
  const panelBot = y(18) + 26;
  svg.appendChild(mk("rect", { x: 0, y: panelTop, width: W, height: panelBot - panelTop, class: "staff-bg" }));
  [...TREBLE_LINES, ...BASS_LINES].forEach((d) =>
    svg.appendChild(mk("line", { x1: X_LEFT, y1: y(d), x2: X_RIGHT, y2: y(d), class: "gs-line" }))
  );

  // Systemklammer links: verbindet Violin- und Bassschluessel zum Grand Staff.
  svg.appendChild(mk("line", { x1: X_LEFT, y1: y(38), x2: X_LEFT, y2: y(18), class: "gs-bracket" }));

  // Notenschluessel (grosse Unicode-Glyphen).
  const treble = mk("text", { x: X_LEFT + 16, y: y(34) + 34, class: "gs-clef", "font-size": 118 });
  treble.textContent = "𝄞"; // 𝄞
  svg.appendChild(treble);
  const bass = mk("text", { x: X_LEFT + 16, y: y(22) - 4, class: "gs-clef", "font-size": 98 });
  bass.textContent = "𝄢"; // 𝄢
  svg.appendChild(bass);

  // Note auf dem angegebenen Schluessel platzieren.
  const midDia = clef === "bass" ? 22 : 34; // Mittellinie des Systems
  const noteDia = diatonicNumber(midi);
  const steps = noteDia - midDia; // positiv = hoeher als die Mittellinie
  const cx = W * 0.58;
  const ny = y(noteDia);

  // Hilfslinien ober-/unterhalb des Systems (durch bzw. neben dem Notenkopf).
  const ledger = (yy) =>
    svg.appendChild(mk("line", { x1: cx - 34, y1: yy, x2: cx + 34, y2: yy, class: "gs-ledger" }));
  if (steps > 4) for (let s = 6; s <= steps; s += 2) ledger(y(midDia + s));
  else if (steps < -4) for (let s = -6; s >= steps; s -= 2) ledger(y(midDia + s));

  // Notenkopf (leicht schraeg, wie handschriftlich).
  svg.appendChild(
    mk("ellipse", {
      cx,
      cy: ny,
      rx: 16,
      ry: 12,
      transform: `rotate(-20 ${cx} ${ny})`,
      class: "gs-note",
    })
  );

  // Notenhals: bei tiefen Noten nach oben, sonst nach unten.
  const stemUp = steps < 0;
  const sx = stemUp ? cx + 15 : cx - 15;
  const sy2 = stemUp ? ny - 88 : ny + 88;
  svg.appendChild(mk("line", { x1: sx, y1: ny, x2: sx, y2: sy2, class: "gs-stem" }));

  return svg;
}
