// Alle Bildschirme der App und der Ablauf einer Lern-Sitzung.
// Fluss: Instrument waehlen -> Modus waehlen -> Lernen.
import { store } from "../core/store.js";
import { SessionEngine } from "../core/session.js";
import { INSTRUMENTS, getInstrument } from "../instruments/registry.js";
import { ensureAudio } from "../core/audio.js";
import { initMidi, isMidiEnabled, feedNote, onNote } from "../core/input.js";
import { startMic, stopMic } from "../core/pitch.js";
import { chromaticLabel } from "../core/theory.js";

const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_SETTINGS = { length: 15, naming: "de" };

let settings = { ...DEFAULT_SETTINGS };
let current = null; // aktuell gewaehltes Instrument (aus der Registry)

const root = () => document.getElementById("app");

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function dayStr(d) {
  return d.toISOString().slice(0, 10);
}
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function stat(icon, value, label) {
  const s = el("div", "stat");
  s.appendChild(el("div", "stat-icon", icon));
  s.appendChild(el("div", "stat-value", String(value)));
  s.appendChild(el("div", "stat-label", label));
  return s;
}

export async function boot() {
  showInstruments();
  try {
    const s = await store.getMeta("settings", {});
    settings = { ...DEFAULT_SETTINGS, ...s };
  } catch (e) {
    /* Standardwerte reichen */
  }
}

// ---------- Instrument-Auswahl ----------
function showInstruments() {
  const app = root();
  app.innerHTML = "";
  const view = el("div", "view");

  const header = el("header", "app-header");
  header.appendChild(el("div", "eyebrow", "Instrumente lernen"));
  header.appendChild(el("h1", "app-title", "Was moechtest du lernen?"));
  header.appendChild(el("p", "app-sub", "Waehle dein Instrument"));
  view.appendChild(header);

  const grid = el("div", "inst-grid");
  INSTRUMENTS.forEach((inst) => {
    const card = el("div", "inst-card" + (inst.available ? "" : " soon"));
    card.appendChild(el("div", "emoji", inst.emoji));
    card.appendChild(el("div", "name", inst.name));
    if (!inst.available) card.appendChild(el("div", "badge", "bald"));
    if (inst.available) {
      card.addEventListener("click", () => {
        ensureAudio();
        current = inst;
        showModes();
      });
    }
    grid.appendChild(card);
  });
  view.appendChild(grid);

  view.appendChild(
    el("p", "method-hint", "Prinzip Klang vor Zeichen: erst hoeren und spielen, dann lesen. Taeglich kurz schlaegt selten lang.")
  );
  app.appendChild(view);
}

// ---------- Modus-Menue ----------
function showModes() {
  const app = root();
  app.innerHTML = "";
  const view = el("div", "view");

  const bar = el("div", "topbar");
  const back = el("button", "iconbtn", "‹");
  back.addEventListener("click", showInstruments);
  bar.appendChild(back);
  bar.appendChild(el("div", "title", `${current.emoji}  ${current.name}`));
  const gear = el("button", "iconbtn", "⚙︎");
  gear.addEventListener("click", showSettings);
  bar.appendChild(gear);
  view.appendChild(bar);

  const stats = el("div", "stat-row");
  const streakStat = stat("🔥", "·", "Tage");
  const learnedStat = stat("🎼", `·/${current.curriculum.length}`, "Noten sitzen");
  stats.appendChild(streakStat);
  stats.appendChild(learnedStat);
  view.appendChild(stats);

  Promise.all([store.allCards(), store.getMeta("streak", 0)])
    .then(([cards, streak]) => {
      const ids = new Set(current.curriculum.map((c) => c.id));
      const learned = cards.filter((c) => ids.has(c.id) && c.box >= 1).length;
      streakStat.querySelector(".stat-value").textContent = String(streak);
      streakStat.querySelector(".stat-label").textContent = streak === 1 ? "Tag" : "Tage";
      learnedStat.querySelector(".stat-value").textContent = `${learned}/${current.curriculum.length}`;
    })
    .catch(() => {});

  const list = el("div", "mode-list");
  list.appendChild(
    modeCard("🎯", "Tagestraining", `Gemischt, ${settings.length} Min, empfohlen`, "hero", () =>
      runSession("daily")
    )
  );
  list.appendChild(modeCard("🎼", "Noten lesen", "Note lesen und am Klavier spielen", "", () => runSession("read")));
  list.appendChild(modeCard("👂", "Gehoer", "Ton hoeren und am Klavier nachspielen", "", () => runSession("ear")));
  list.appendChild(soonCard("✋", "Fingersatz", "Tonleitern und Daumenuntersatz"));
  list.appendChild(soonCard("🥁", "Rhythmus", "Timing und Metronom"));
  list.appendChild(soonCard("🎵", "Stuecke", "Lieder in kleinen Haeppchen"));
  view.appendChild(list);

  app.appendChild(view);
}

function modeCard(icon, title, sub, extra, onClick) {
  const c = el("button", "mode-card " + extra);
  c.appendChild(el("div", "mode-ic", icon));
  const t = el("div", "mode-txt");
  t.appendChild(el("div", "mode-title", title));
  t.appendChild(el("div", "mode-sub", sub));
  c.appendChild(t);
  c.appendChild(el("div", "mode-chevron", "›"));
  c.addEventListener("click", onClick);
  return c;
}
function soonCard(icon, title, sub) {
  const c = el("div", "mode-card soon");
  c.appendChild(el("div", "mode-ic", icon));
  const t = el("div", "mode-txt");
  t.appendChild(el("div", "mode-title", title));
  t.appendChild(el("div", "mode-sub", sub));
  c.appendChild(t);
  c.appendChild(el("div", "mode-badge", "bald"));
  return c;
}

// ---------- Lern-Sitzung ----------
// Es wird ausschliesslich am echten Klavier gespielt: die Note steht gross im
// System, das Mikrofon hoert zu und erkennt, ob richtig gespielt wurde.
async function runSession(mode) {
  ensureAudio();
  const app = root();
  app.innerHTML = "";
  const engine = new SessionEngine(store, current.curriculum, {
    durationMin: settings.length,
    naming: settings.naming,
    mode,
  });

  const view = el("div", "view session-live");

  let unsub = () => {};
  const stop = () => {
    unsub();
    stopMic();
  };

  const top = el("div", "session-top");
  const close = el("button", "iconbtn", "✕");
  close.addEventListener("click", () => {
    stop();
    showModes();
  });
  const bar = el("div", "progress");
  const barFill = el("div", "progress-fill");
  bar.appendChild(barFill);
  const timeLbl = el("div", "time-left", "");
  top.appendChild(close);
  top.appendChild(bar);
  top.appendChild(timeLbl);
  view.appendChild(top);

  const prompt = el("div", "prompt", "");
  view.appendChild(prompt);
  const stimWrap = el("div", "stimulus", "");
  const stimCard = el("div", "staff-card");
  stimWrap.appendChild(stimCard);
  view.appendChild(stimWrap);
  const feedback = el("div", "feedback", "");
  view.appendChild(feedback);

  // Mikrofon-Leiste: Status-Punkt, Live-Anzeige des Gehoerten, Pegelbalken.
  const micPanel = el("div", "mic-panel");
  micPanel.appendChild(el("div", "mic-dot"));
  const micInfo = el("div", "mic-info");
  const micTitle = el("div", "mic-title", "Mikrofon startet ...");
  const micHeard = el("div", "mic-heard", "");
  micInfo.appendChild(micTitle);
  micInfo.appendChild(micHeard);
  micPanel.appendChild(micInfo);
  const meter = el("div", "mic-meter");
  const meterFill = el("div", "mic-meter-fill");
  meter.appendChild(meterFill);
  micPanel.appendChild(meter);
  view.appendChild(micPanel);

  app.appendChild(view);

  // Eingabe (Mikrofon jetzt, spaeter auch MIDI) laeuft ueber onNote in die Antwort.
  let answer = null;
  unsub = onNote(({ midi }) => {
    if (answer) answer(midi);
  });

  const ok = await startMic((midi) => feedNote(midi, 0.9, "mic"), {
    minMidi: current.config.lowestMidi - 12,
    maxMidi: current.config.highestMidi + 12,
    onLevel: (l) => {
      meterFill.style.width = Math.round(l * 100) + "%";
    },
    onRaw: (midi) => {
      micHeard.textContent = "gehoert: " + chromaticLabel(midi, settings.naming);
    },
  });
  if (ok) {
    micPanel.classList.add("live");
    micTitle.textContent = "Spiel die Note am Klavier";
  } else {
    micPanel.classList.add("err");
    micTitle.textContent = "Kein Mikrofon-Zugriff";
    micHeard.textContent = "Bitte in den Browser-Einstellungen das Mikrofon erlauben.";
  }

  const tick = setInterval(() => {
    barFill.style.width = engine.progress * 100 + "%";
    timeLbl.textContent = fmtTime(engine.timeLeft);
  }, 500);

  let sincePause = 0;
  try {
    while (!engine.done) {
      const task = await engine.nextTask();
      if (!task) break;
      prompt.textContent = task.kind === "ear" ? "Hoere und spiele" : "Lies und spiele";
      prompt.appendChild(el("div", "prompt-sub", task.prompt));
      task.render(stimCard);
      stimCard.className = "staff-card";
      feedback.textContent = "";
      feedback.className = "feedback";

      const pressed = await new Promise((res) => {
        answer = (m) => {
          answer = null;
          res(m);
        };
      });

      const correct = task.check(pressed);
      if (correct) {
        stimCard.classList.add("good");
        feedback.textContent = task.label ? `Richtig · ${task.label}` : "Richtig";
        feedback.className = "feedback good";
      } else {
        stimCard.classList.add("bad");
        task.reveal();
        feedback.textContent = task.label ? `Das war ${task.label}` : "Nicht ganz";
        feedback.className = "feedback bad";
      }
      await engine.record(task, correct);
      barFill.style.width = engine.progress * 100 + "%";

      await delay(correct ? 900 : 1700);
      sincePause++;
      if (sincePause >= 6 && !engine.done) {
        await microPause(view);
        sincePause = 0;
      }
    }
  } finally {
    clearInterval(tick);
    stop();
  }
  await finishSession(engine);
}

function fmtTime(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function microPause(view) {
  return new Promise((res) => {
    const overlay = el("div", "overlay pause");
    overlay.appendChild(el("div", "pause-title", "Kurze Pause"));
    overlay.appendChild(el("div", "pause-sub", "Durchatmen. Pausen festigen das Gelernte."));
    let left = 15;
    const cnt = el("div", "pause-count", String(left));
    overlay.appendChild(cnt);
    const skip = el("button", "btn ghost", "Weiter");
    overlay.appendChild(skip);
    view.appendChild(overlay);
    const iv = setInterval(() => {
      left--;
      cnt.textContent = String(left);
      if (left <= 0) done();
    }, 1000);
    skip.addEventListener("click", done);
    function done() {
      clearInterval(iv);
      overlay.remove();
      res();
    }
  });
}

async function finishSession(engine) {
  if (engine.count > 0) {
    const today = dayStr(new Date());
    const last = await store.getMeta("lastSessionDay", null);
    if (last !== today) {
      const yesterday = dayStr(new Date(Date.now() - DAY));
      const streak = await store.getMeta("streak", 0);
      await store.setMeta("streak", last === yesterday ? streak + 1 : 1);
      await store.setMeta("lastSessionDay", today);
    }
  }

  const app = root();
  app.innerHTML = "";
  const view = el("div", "view done");
  view.appendChild(el("div", "done-emoji", "✓"));
  view.appendChild(el("h2", "done-title", "Einheit geschafft"));
  const pct = engine.count ? Math.round((engine.correct / engine.count) * 100) : 0;
  const summary = el("div", "done-stats");
  summary.appendChild(stat("🎯", `${engine.correct}/${engine.count}`, "richtig"));
  summary.appendChild(stat("📈", pct + "%", "Trefferquote"));
  summary.appendChild(stat("🔥", await store.getMeta("streak", 0), "Tage"));
  view.appendChild(summary);

  const again = el("button", "btn primary big", "Weiter ueben");
  again.addEventListener("click", showModes);
  view.appendChild(again);
  const home = el("button", "btn ghost", "Instrument wechseln");
  home.addEventListener("click", showInstruments);
  view.appendChild(home);
  app.appendChild(view);
}

// ---------- Einstellungen ----------
async function showSettings() {
  const app = root();
  app.innerHTML = "";
  const view = el("div", "view");
  const bar = el("div", "topbar");
  const back = el("button", "iconbtn", "‹");
  back.addEventListener("click", () => (current ? showModes() : showInstruments()));
  bar.appendChild(back);
  bar.appendChild(el("div", "title", "Einstellungen"));
  view.appendChild(bar);

  view.appendChild(
    choiceRow("Laenge der Einheit", [5, 10, 15, 20], settings.length, (v) => {
      settings.length = v;
      saveSettings();
    }, (v) => v + " Min")
  );
  view.appendChild(
    choiceRow("Notennamen", ["de", "int"], settings.naming, (v) => {
      settings.naming = v;
      saveSettings();
    }, (v) => (v === "de" ? "Deutsch (H)" : "International (B)"))
  );
  const midiRow = el("div", "setting-row");
  midiRow.appendChild(el("div", "setting-label", "Echtes Keyboard (MIDI)"));
  const midiBtn = el("button", "btn ghost small", isMidiEnabled() ? "verbunden" : "verbinden");
  const midiStatus = el("div", "setting-note", "Optional fuers E-Piano. Sonst hoert das Mikrofon zu.");
  midiBtn.addEventListener("click", async () => {
    await initMidi((s) => (midiStatus.textContent = s));
  });
  midiRow.appendChild(midiBtn);
  midiRow.appendChild(midiStatus);
  view.appendChild(midiRow);

  const dataRow = el("div", "setting-row");
  dataRow.appendChild(el("div", "setting-label", "Fortschritt sichern"));
  const exp = el("button", "btn ghost small", "Export");
  exp.addEventListener("click", exportData);
  const imp = el("button", "btn ghost small", "Import");
  const file = el("input");
  file.type = "file";
  file.accept = "application/json";
  file.style.display = "none";
  file.addEventListener("change", importData);
  imp.addEventListener("click", () => file.click());
  dataRow.appendChild(exp);
  dataRow.appendChild(imp);
  dataRow.appendChild(file);
  dataRow.appendChild(el("div", "setting-note", "iOS kann lokalen Speicher loeschen, ab und zu sichern."));
  view.appendChild(dataRow);

  const reset = el("button", "btn danger", "Fortschritt zuruecksetzen");
  reset.addEventListener("click", async () => {
    if (confirm("Wirklich allen Fortschritt loeschen?")) {
      await store.clearCards();
      await store.setMeta("streak", 0);
      await store.setMeta("lastSessionDay", null);
      current ? showModes() : showInstruments();
    }
  });
  view.appendChild(reset);

  view.appendChild(el("p", "version-note", "Version 0.4 · privat"));
  app.appendChild(view);
}

function choiceRow(label, options, currentVal, onPick, fmt) {
  const row = el("div", "setting-row");
  row.appendChild(el("div", "setting-label", label));
  const group = el("div", "seg");
  options.forEach((opt) => {
    const b = el("button", "seg-btn" + (opt === currentVal ? " on" : ""), fmt ? fmt(opt) : String(opt));
    b.addEventListener("click", () => {
      group.querySelectorAll(".seg-btn").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      onPick(opt);
    });
    group.appendChild(b);
  });
  row.appendChild(group);
  return row;
}

async function saveSettings() {
  await store.setMeta("settings", settings);
}

async function exportData() {
  const data = await store.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "instrumente-lernen-sicherung.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(e) {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    await store.importAll(data);
    if (data.meta && data.meta.settings) settings = { ...DEFAULT_SETTINGS, ...data.meta.settings };
    alert("Fortschritt geladen.");
    current ? showModes() : showInstruments();
  } catch (err) {
    alert("Konnte die Datei nicht lesen: " + err.message);
  }
}
