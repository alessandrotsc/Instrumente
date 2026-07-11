# Technik und Architektur (Recherche-Grundlage)

## Entscheidung fuer dieses Projekt

Da auf dem Rechner kein Node installiert ist und Langlebigkeit/Wartbarkeit
Vorrang haben, ist die App bewusst OHNE Build gebaut: reines HTML/CSS/JavaScript
mit ES-Modulen, keine Abhaengigkeiten, komplett offline. Deploy = statische
Dateien auf GitHub Pages, kein Build der fehlschlagen kann.

(Der recherchierte Standardweg mit Vite + Svelte + TypeScript bleibt eine Option,
falls das Projekt spaeter groesser wird und ein Build akzeptabel ist.)

## PWA auf GitHub Pages, installierbar aufs iPhone

- Drei Bausteine: Manifest, Service Worker, HTTPS (Pages liefert HTTPS).
- Relative Pfade in Manifest und Service Worker, damit es im Unterordner
  `/repo/` von GitHub Pages laeuft. `.nojekyll` liegt bei.
- iOS-Stolperfallen: kein automatischer Install-Prompt (Nutzer muss ueber Teilen
  "Zum Home-Bildschirm", ab iOS 16.4), `apple-touch-icon` explizit setzen,
  AudioContext startet erst nach Tap, iOS raeumt Cache/IndexedDB nach ca. 7 Tagen
  Nichtnutzung (Export/Import als Sicherung, `storage.persist()`).

## Klang

- Aktuell: eigener Web-Audio-Synth (sofort da, offline, keine Abhaengigkeit).
- Spaeter nachruestbar: smplr (`SplendidGrandPiano`, Steinway-Samples ohne eigenen
  Server) plus Tone.js fuer praezises Timing und Metronom.

## Eingabe: Touch und MIDI

- Web MIDI gibt es auf dem iPhone NICHT (in keinem Browser, kein Fahrplan).
  Deshalb ist die virtuelle Klaviatur der vollwertige Hauptweg.
- Auf Android/Rechner optional echtes Digitalpiano per USB/Bluetooth
  (navigator.requestMIDIAccess, spaeter ggf. webmidi.js).
- Beide Quellen laufen durch dieselbe interne Schnittstelle (`core/input.js`),
  der Lernkern bleibt quellen-unabhaengig.

## Noten darstellen und Lieder

- Aktuell: eigene schlanke SVG-Notendarstellung fuer einzelne Noten (`core/notation.js`).
- Fuer ganze Lieder spaeter: OpenSheetMusicDisplay mit MusicXML als Speicherformat,
  dazu abgeleitete Notenfolge als JSON fuer die Logik (Abschnitte, erwartete Tasten).

## Datenmodell fuer mehrere Instrumente

- Lernlogik instrument-unabhaengig (SRS, Session, Fortschritt kennen nur abstrakte
  Begriffe wie Karte, Note, MIDI-Nummer).
- Ein Instrument = Konfiguration plus Adapter plus Lehrplan-Daten unter
  `src/instruments/<name>/`. Weiteres Instrument = neuer Ordner, Kern bleibt gleich.

## Fortschritt speichern

- IndexedDB (`core/store.js`) fuer Karten und Meta (Streak, Einstellungen).
- Export/Import als JSON gegen iOS-Speicherbereinigung.
- Spaeter optional Geraete-Sync (GitHub Gist, Supabase o. ae.), Schnittstelle bleibt abstrakt.
