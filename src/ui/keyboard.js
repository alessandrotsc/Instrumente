// Virtuelle Klaviatur (Touch) als vollwertiger Eingabeweg. MIDI-Tasten werden
// ueber dieselbe Eingabe-Schnittstelle sichtbar gemacht.
import { feedNote, onNote } from "../core/input.js";
import { isWhite, noteName } from "../core/theory.js";

const BLACK_PC = [1, 3, 6, 8, 10];

export function buildKeyboard(container, { low = 48, high = 84, onPress } = {}) {
  container.innerHTML = "";
  const kb = document.createElement("div");
  kb.className = "keyboard";

  const whites = [];
  for (let m = low; m <= high; m++) if (isWhite(m)) whites.push(m);
  const whiteW = 100 / whites.length;
  const keyEls = new Map();

  whites.forEach((m) => {
    const k = document.createElement("div");
    k.className = "key white";
    k.dataset.midi = m;
    k.style.width = whiteW + "%";
    kb.appendChild(k);
    keyEls.set(m, k);
  });

  for (let m = low; m <= high; m++) {
    if (!BLACK_PC.includes(m % 12)) continue;
    const idx = whites.indexOf(m - 1); // weisse Taste direkt links davon
    if (idx < 0) continue;
    const k = document.createElement("div");
    k.className = "key black";
    k.dataset.midi = m;
    k.style.left = `calc(${(idx + 1) * whiteW}% - ${whiteW * 0.3}%)`;
    k.style.width = whiteW * 0.6 + "%";
    kb.appendChild(k);
    keyEls.set(m, k);
  }

  container.appendChild(kb);

  kb.addEventListener("pointerdown", (e) => {
    const t = e.target.closest(".key");
    if (!t) return;
    e.preventDefault();
    feedNote(+t.dataset.midi, 0.85, "touch");
  });

  // Touch spielt bereits ueber feedNote; hier reagieren wir auf ALLE Quellen
  // (Touch und MIDI), damit Taste kurz aufleuchtet und die Logik die Note bekommt.
  const unsub = onNote(({ midi }) => {
    const el = keyEls.get(midi);
    if (el) flash(el);
    onPress && onPress(midi);
  });

  function flash(el) {
    el.classList.add("active");
    setTimeout(() => el.classList.remove("active"), 170);
  }
  function pulse(el, cls) {
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 700);
  }

  return {
    el: kb,
    keyEls,
    markCorrect(m) {
      pulse(keyEls.get(m), "correct");
    },
    markWrong(m) {
      pulse(keyEls.get(m), "wrong");
    },
    setLabels(fn) {
      // fn(midi) -> Text oder null
      keyEls.forEach((el, m) => {
        const t = fn(m);
        if (t) {
          el.dataset.label = t;
          el.classList.add("labeled");
        } else {
          delete el.dataset.label;
          el.classList.remove("labeled");
        }
      });
    },
    labelWhites(naming) {
      this.setLabels((m) => (isWhite(m) ? noteName(m, naming) : null));
    },
    clearLabels() {
      this.setLabels(() => null);
    },
    destroy() {
      unsub();
    },
  };
}
