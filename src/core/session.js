// Sitzungslogik mit verschiedenen Modi. 15 bis 20 Minuten, intern kurze
// abwechselnde Aufgaben (Interleaving), Spaced Repetition entscheidet, was
// drankommt. Rendering passiert in der UI.
import { Scheduler } from "./scheduler.js";
import { makeReadTask, makeEarTask } from "../modules/noteRecognition.js";

// mode: "daily" (gemischt lesen + Gehoer), "read" (nur Noten lesen), "ear" (nur Gehoer)
export class SessionEngine {
  constructor(store, curriculum, { durationMin = 15, naming = "de", mode = "daily" } = {}) {
    this.store = store;
    this.sched = new Scheduler(store, curriculum, { newPerSession: 6 });
    this.durationMs = durationMin * 60 * 1000;
    this.naming = naming;
    this.mode = mode;
    this.earRatio = mode === "ear" ? 1 : mode === "read" ? 0 : 0.3;
    this.count = 0;
    this.correct = 0;
    this.startedAt = Date.now();
  }

  get elapsed() {
    return Date.now() - this.startedAt;
  }
  get timeLeft() {
    return Math.max(0, this.durationMs - this.elapsed);
  }
  get progress() {
    return Math.min(1, this.elapsed / this.durationMs);
  }
  get done() {
    return this.timeLeft <= 0;
  }

  async nextTask() {
    const now = Date.now();
    const entry = await this.sched.next(now);
    if (!entry) return null;
    const card = await this.store.getCard(entry.id);
    // Gehoer-Aufgabe nur fuer Noten, die schon einmal gelesen wurden.
    let useEar;
    if (this.mode === "ear") useEar = true;
    else if (this.mode === "read") useEar = false;
    else useEar = card && card.seen && this.count > 1 && Math.random() < this.earRatio;
    const task = useEar
      ? makeEarTask(entry, this.naming)
      : makeReadTask(entry, this.naming);
    task._entry = entry;
    return task;
  }

  async record(task, correct) {
    this.count++;
    if (correct) this.correct++;
    await this.sched.record(task._entry.id, correct, Date.now());
  }
}
