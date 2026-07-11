// Waehlt aus, welche Lerneinheit als naechstes drankommt.
// Regel: erst faellige Wiederholungen (schwaechste Box zuerst), dann neue Einheiten
// aus dem Lehrplan einfuehren (begrenzt pro Sitzung), sonst die schwaechste ueben.
import { newCard, grade, isDue } from "./srs.js";

export class Scheduler {
  constructor(store, curriculum, { newPerSession = 6 } = {}) {
    this.store = store;
    this.curriculum = curriculum;
    this.newPerSession = newPerSession;
    this.newIntroduced = 0;
  }

  entry(id) {
    return this.curriculum.find((e) => e.id === id) || null;
  }

  async cardFor(id, extra = {}) {
    let c = await this.store.getCard(id);
    if (!c) {
      c = newCard(id, extra);
      await this.store.putCard(c);
    }
    return c;
  }

  async next(now) {
    const all = await this.store.allCards();
    const byId = new Map(all.map((c) => [c.id, c]));

    // 1) faellige Wiederholung, schwaechste Box zuerst
    const due = all
      .filter((c) => isDue(c, now) && this.entry(c.id))
      .sort((a, b) => a.box - b.box || a.due - b.due);
    if (due.length) return this.entry(due[0].id);

    // 2) neue Note aus dem Lehrplan einfuehren
    if (this.newIntroduced < this.newPerSession) {
      const nextNew = this.curriculum.find((e) => {
        const c = byId.get(e.id);
        return !c || !c.seen;
      });
      if (nextNew) {
        this.newIntroduced++;
        return nextNew;
      }
    }

    // 3) nichts faellig, nichts neu: die schwaechste bereits gesehene ueben
    const seen = all.filter((c) => c.seen && this.entry(c.id));
    if (seen.length) {
      seen.sort((a, b) => a.box - b.box || a.due - b.due);
      return this.entry(seen[0].id);
    }
    return null;
  }

  async record(id, correct, now, extra = {}) {
    const c = await this.cardFor(id, extra);
    const g = grade(c, correct, now);
    await this.store.putCard(g);
    return g;
  }
}
