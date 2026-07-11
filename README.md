# Instrumente lernen

Private, installierbare Lern App (PWA) zum Instrumente lernen. Start mit Klavier,
spaeter weitere Instrumente. Kein Build noetig, keine externen Abhaengigkeiten,
laeuft offline. Gehostet ueber GitHub Pages, Icon aufs Handy, aktualisiert sich
bei jedem Push automatisch.

Prinzip: Klang vor Zeichen. Erst hoeren und spielen, dann lesen. Taeglich kurz
(15 bis 20 Minuten) mit kurzen abwechselnden Bloecken und Pausen. Noten werden
als echte Noten gelernt (keine Farbpunkte, keine Zahlen), der passende Finger
sitzt spaeter mit. Spaced Repetition sorgt dafuer, dass jede Taste ihre Note behaelt.

## Lokal ansehen

Die App braucht einen kleinen Webserver (wegen der Module), Doppelklick auf die
Datei reicht nicht. Im Projektordner:

    python3 -m http.server 8123

Dann im Browser oeffnen: http://localhost:8123/
Zum Testen ohne Service Worker: http://localhost:8123/?nosw

## Auf GitHub Pages veroeffentlichen

1. Auf github.com ein neues Repository anlegen, z. B. `instrumente-lernen`
   (oeffentlich, dann ist GitHub Pages kostenlos).
2. Im Projektordner das Repo verbinden und hochladen:

       git remote add origin https://github.com/DEINNAME/instrumente-lernen.git
       git branch -M main
       git push -u origin main

3. Auf GitHub: Settings -> Pages -> Source: Deploy from a branch,
   Branch `main`, Ordner `/ (root)`, speichern.
4. Nach kurzer Zeit ist die App erreichbar unter:
   https://DEINNAME.github.io/instrumente-lernen/
5. Auf dem iPhone die Adresse in Safari oeffnen, unten Teilen antippen,
   dann "Zum Home-Bildschirm". Fertig, Icon liegt auf dem Handy.

Ab dann gilt: aendern, committen, `git push`, und die App aktualisiert sich
auf allen Geraeten automatisch.

## Aufbau

Die Lernlogik ist instrument-unabhaengig, ein Instrument ist nur Daten plus Adapter.
Ein weiteres Instrument (z. B. Gitarre) waere ein neuer Ordner unter `src/instruments/`.

    src/
      core/        instrument-unabhaengig
        theory.js       Noten, Tonhoehen, Positionen
        audio.js        Klang (Web Audio), spaeter sampled Piano nachruestbar
        input.js        vereinheitlicht Touch UND MIDI-Keyboard
        srs.js          Spaced Repetition (Leitner)
        scheduler.js    waehlt die naechste Lerneinheit
        store.js        Fortschritt in IndexedDB, Export/Import
        notation.js     zeichnet Noten aufs System (SVG)
        session.js      Ablauf einer 15-bis-20-Minuten-Einheit
      instruments/
        piano.js        Klavier: Umfang, Layout, Lehrplan der Noten
      modules/
        noteRecognition.js   Taste kennt ihre Note (Lesen + Gehoer)
      ui/
        keyboard.js     virtuelle Klaviatur
        screens.js      alle Bildschirme
      app.js            Start, Service Worker, iPhone-Hinweis
      styles.css

## Naechste Schritte (Ideen)

- Sampled Klavierklang (smplr) statt Synth
- Modul Fingersatz (Tonleitern, Daumenuntersatz)
- Modul Rhythmus mit Metronom und Timing
- Stuecke in kleinen Haeppchen, Noten als MusicXML einspeichern (OpenSheetMusicDisplay)
- Geraete-Sync des Fortschritts (optional)
