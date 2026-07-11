// Fortschritts-Speicher auf IndexedDB. Haelt Lernkarten und Meta-Daten (Streak,
// Einstellungen, Statistik). Export/Import als JSON, weil iOS bei laengerer
// Nichtnutzung den lokalen Speicher raeumen kann.
const DB_NAME = "instrumente-lernen";
const DB_VER = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("cards")) db.createObjectStore("cards", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

async function os(name, mode = "readonly") {
  const db = await open();
  return db.transaction(name, mode).objectStore(name);
}
function reqP(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

const META_KEYS = ["streak", "lastSessionDay", "settings", "stats"];

export const store = {
  async getCard(id) {
    return reqP((await os("cards")).get(id));
  },
  async putCard(c) {
    return reqP((await os("cards", "readwrite")).put(c));
  },
  async allCards() {
    return reqP((await os("cards")).getAll());
  },
  async clearCards() {
    return reqP((await os("cards", "readwrite")).clear());
  },
  async getMeta(key, def = null) {
    const v = await reqP((await os("meta")).get(key));
    return v === undefined ? def : v;
  },
  async setMeta(key, val) {
    return reqP((await os("meta", "readwrite")).put(val, key));
  },
  async exportAll() {
    const cards = await this.allCards();
    const meta = {};
    for (const k of META_KEYS) meta[k] = await this.getMeta(k);
    return { app: "instrumente-lernen", version: 1, exportedAt: Date.now(), cards, meta };
  },
  async importAll(data) {
    if (!data || !Array.isArray(data.cards)) throw new Error("Ungueltige Sicherungsdatei");
    await this.clearCards();
    for (const c of data.cards) await this.putCard(c);
    if (data.meta) {
      for (const [k, v] of Object.entries(data.meta)) {
        if (v != null) await this.setMeta(k, v);
      }
    }
  },
};
