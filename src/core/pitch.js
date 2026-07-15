// Tonhoehen-Erkennung uebers Mikrofon: einzelne Klaviernoten erkennen.
// Web Audio API: Mikrofon -> AnalyserNode -> Autokorrelation -> naechste MIDI-Note.
// Bewusst nur monophon (ein Ton nach dem anderen). Akkorde (mehrere Tasten
// gleichzeitig) sind deutlich schwerer und kommen spaeter als eigener Modus.
import { ensureAudio } from "./audio.js";
import { midiFreq } from "./theory.js";

let stream = null;
let sourceNode = null;
let analyser = null;
let buf = null;
let running = false;

export function isMicRunning() {
  return running;
}

// Frequenz (Hz) -> naechstgelegene MIDI-Note (60 = mittleres C).
export function freqToMidi(freq) {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

// Autokorrelation (Verfahren nach Chris Wilson, hier auf den plausiblen
// Tonhoehenbereich begrenzt und laengen-normiert, damit es auch auf dem Handy
// fluessig laeuft und keine Oktavfehler nach unten macht).
function detectFreq(buf, rate, minLag, maxLag) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.008) return { freq: -1, rms }; // zu leise -> als Stille werten

  const lo = Math.max(2, minLag);
  const hi = Math.min(maxLag, Math.floor(SIZE / 2));
  const corr = new Float32Array(hi + 2);
  let maxVal = 0;
  for (let lag = lo; lag <= hi; lag++) {
    let sum = 0;
    const n = SIZE - lag;
    for (let i = 0; i < n; i++) sum += buf[i] * buf[i + lag];
    sum /= n; // auf die Anzahl Summanden normieren -> kein Laengen-Bias
    corr[lag] = sum;
    if (sum > maxVal) maxVal = sum;
  }
  if (maxVal <= 0) return { freq: -1, rms };

  // Klarheit: wie periodisch ist das Signal ueberhaupt? Filtert Rauschen weg.
  const clarity = maxVal / (rms * rms);
  if (clarity < 0.5) return { freq: -1, rms };

  // Ersten deutlichen Peak nehmen (kuerzeste Periode) -> Grundton statt Oktave drunter.
  const thresh = maxVal * 0.9;
  let best = -1;
  for (let lag = lo + 1; lag < hi; lag++) {
    if (corr[lag] > thresh && corr[lag] > corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      best = lag;
      break;
    }
  }
  if (best <= 0) return { freq: -1, rms };

  // Parabolische Verfeinerung um das Maximum fuer genauere Frequenz.
  const a = corr[best - 1], b = corr[best], c = corr[best + 1];
  const denom = a - 2 * b + c;
  const shift = denom ? (0.5 * (a - c)) / denom : 0;
  const period = best + shift;
  return { freq: rate / period, rms };
}

// Startet das Mikrofon und ruft onDetect(midi) auf, sobald eine stabile Note
// erkannt wurde. minMidi/maxMidi begrenzen den Suchbereich. onLevel(0..1) fuer
// eine Pegelanzeige, onRaw(midi) fuer eine Live-Anzeige des gerade Gehoerten.
export async function startMic(onDetect, { minMidi = 36, maxMidi = 84, onLevel, onRaw, onError } = {}) {
  if (running) return true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    onError && onError(new Error("Mikrofon nicht verfuegbar"));
    return false;
  }
  const ctx = ensureAudio();
  try {
    // Rauschunterdrueckung und Verstaerkung AUS: die verfaelschen die Tonhoehe.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false,
    });
  } catch (err) {
    onError && onError(err);
    return false;
  }

  sourceNode = ctx.createMediaStreamSource(stream);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  buf = new Float32Array(analyser.fftSize);
  sourceNode.connect(analyser); // bewusst NICHT an die Ausgabe -> keine Rueckkopplung
  running = true;

  const rate = ctx.sampleRate;
  const minFreq = midiFreq(minMidi) * 0.97;
  const maxFreq = midiFreq(maxMidi) * 1.03;
  const minLag = Math.floor(rate / maxFreq);
  const maxLag = Math.ceil(rate / minFreq);

  let stableMidi = null; // aktuell beobachtete Note
  let stableCount = 0; // wie oft in Folge gleich gesehen
  let lastEmitted = null; // zuletzt gemeldete Note (erst nach Stille zuruecksetzen)
  let silent = 0;
  let lastTs = 0;

  const loop = (ts) => {
    if (!running) return;
    requestAnimationFrame(loop);
    if (ts - lastTs < 45) return; // ~22 mal pro Sekunde reicht und schont den Akku
    lastTs = ts;

    analyser.getFloatTimeDomainData(buf);
    const { freq, rms } = detectFreq(buf, rate, minLag, maxLag);
    onLevel && onLevel(Math.min(1, rms * 6));

    if (freq <= 0) {
      // Nach kurzer Stille darf dieselbe Note wieder erkannt werden.
      if (++silent >= 3) {
        lastEmitted = null;
        stableMidi = null;
        stableCount = 0;
      }
      return;
    }
    silent = 0;

    const midi = freqToMidi(freq);
    if (midi < minMidi || midi > maxMidi) return;
    onRaw && onRaw(midi);

    if (midi === stableMidi) stableCount++;
    else {
      stableMidi = midi;
      stableCount = 1;
    }
    // Erst melden, wenn die Note zweimal in Folge stabil war (entprellt Ein-/Ausschwingen).
    if (stableCount >= 2 && midi !== lastEmitted) {
      lastEmitted = midi;
      onDetect(midi, rms);
    }
  };
  requestAnimationFrame(loop);
  return true;
}

export function stopMic() {
  running = false;
  if (sourceNode) {
    try {
      sourceNode.disconnect();
    } catch (e) {
      /* egal */
    }
    sourceNode = null;
  }
  analyser = null;
  buf = null;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}
