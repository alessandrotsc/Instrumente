// Zeichnet eine einzelne Note auf ein echtes Fuenf-Linien-System (SVG).
// Bewusst echte Notation, keine Farbpunkte oder Zahlen: das Ziel ist echtes Lesen.
import { diatonicNumber } from "./theory.js";

// Referenz: diatonische Nummer der Mittellinie je Schluessel.
// Violinschluessel Mittellinie = H4/B4 (diatonic 34), Bassschluessel = D3 (diatonic 22).
const CLEFS = {
  treble: { glyph: "𝄞", midDia: 34 }, // U+1D11E
  bass: { glyph: "𝄢", midDia: 22 }, // U+1D122
};

const SVGNS = "http://www.w3.org/2000/svg";
function mk(name, attrs = {}) {
  const el = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function renderNote(midi, clef = "treble") {
  const W = 280;
  const H = 200;
  const cx = W * 0.62;
  const cy = H / 2;
  const gap = 18; // Abstand zwischen zwei Notenlinien
  const info = CLEFS[clef] || CLEFS.treble;
  const steps = diatonicNumber(midi) - info.midDia; // positiv = hoeher
  const noteY = cy - steps * (gap / 2);

  const svg = mk("svg", { viewBox: `0 0 ${W} ${H}`, class: "staff" });

  // fuenf Notenlinien (Schritte -4..+4, geradzahlig)
  for (let s = -4; s <= 4; s += 2) {
    const y = cy - s * (gap / 2);
    svg.appendChild(mk("line", { x1: 28, y1: y, x2: W - 18, y2: y, class: "staff-line" }));
  }

  // Notenschluessel
  const clefT = mk("text", {
    x: 34,
    y: clef === "treble" ? cy + gap * 1.2 : cy - gap * 0.2,
    class: "clef",
  });
  clefT.textContent = info.glyph;
  svg.appendChild(clefT);

  // Hilfslinien ober- oder unterhalb des Systems
  if (steps > 4) {
    for (let s = 6; s <= steps; s += 2) {
      const y = cy - s * (gap / 2);
      svg.appendChild(mk("line", { x1: cx - 22, y1: y, x2: cx + 22, y2: y, class: "ledger" }));
    }
  } else if (steps < -4) {
    for (let s = -6; s >= steps; s -= 2) {
      const y = cy - s * (gap / 2);
      svg.appendChild(mk("line", { x1: cx - 22, y1: y, x2: cx + 22, y2: y, class: "ledger" }));
    }
  }

  // Notenkopf (leicht schraeg)
  svg.appendChild(
    mk("ellipse", {
      cx,
      cy: noteY,
      rx: 11,
      ry: 8,
      transform: `rotate(-20 ${cx} ${noteY})`,
      class: "notehead",
    })
  );

  // Notenhals: bei tiefen Noten nach oben, sonst nach unten
  const stemUp = steps < 0;
  const sx = stemUp ? cx + 10 : cx - 10;
  const sy2 = stemUp ? noteY - 62 : noteY + 62;
  svg.appendChild(mk("line", { x1: sx, y1: noteY, x2: sx, y2: sy2, class: "stem" }));

  return svg;
}
