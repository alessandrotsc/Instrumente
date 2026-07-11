// Spaced Repetition nach dem Leitner-Prinzip, instrument- und modul-unabhaengig.
// Jede Lerneinheit wandert bei richtiger Antwort eine Box hoch, bei falscher ganz zurueck.
// Der Abstand bis zur naechsten Wiederholung waechst pro Box.
const MIN = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// Abstand bis zur naechsten Faelligkeit je Box (Box 0..5).
const BOX_INTERVALS = [10 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 45 * DAY];
export const MAX_BOX = 5;

export function newCard(id, extra = {}) {
  return { id, box: 0, reps: 0, lapses: 0, due: 0, seen: false, ...extra };
}

export function grade(card, correct, now) {
  const c = { ...card };
  c.reps += 1;
  c.seen = true;
  if (correct) {
    c.box = Math.min(MAX_BOX, c.box + 1);
  } else {
    c.box = 0;
    c.lapses += 1;
  }
  c.due = now + BOX_INTERVALS[c.box];
  return c;
}

export function isDue(card, now) {
  return card.seen && card.due <= now;
}
