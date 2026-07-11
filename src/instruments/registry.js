// Zentrale Liste aller Instrumente. Neue Instrumente kommen einfach hier dazu
// (mit eigenem Ordner unter src/instruments/). "available: false" zeigt sie im
// Menue als "bald verfuegbar".
import { piano, noteCurriculum as pianoCurriculum } from "./piano.js";

export const INSTRUMENTS = [
  {
    id: piano.id,
    name: piano.name,
    emoji: piano.emoji,
    available: true,
    config: piano,
    curriculum: pianoCurriculum,
  },
  { id: "guitar", name: "Gitarre", emoji: "🎸", available: false },
  { id: "drums", name: "Schlagzeug", emoji: "🥁", available: false },
  { id: "bass", name: "E-Bass", emoji: "🎸", available: false },
  { id: "voice", name: "Gesang", emoji: "🎤", available: false },
  { id: "violin", name: "Geige", emoji: "🎻", available: false },
];

export function getInstrument(id) {
  return INSTRUMENTS.find((i) => i.id === id) || null;
}
