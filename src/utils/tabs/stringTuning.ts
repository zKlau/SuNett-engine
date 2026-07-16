import type { Track } from "../../types/track";

// Chromatic note names, indexed by MIDI pitch modulo 12 (0 = C). Sharps follow
// the Guitar Pro convention.
const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

// The open-string note name for a MIDI pitch, e.g. 64 -> "E", 40 -> "E", 38 -> "D".
export function tuningNoteName(pitch: number): string {
  const index = ((Math.trunc(pitch) % 12) + 12) % 12;
  return NOTE_NAMES[index];
}

// One label per string, top line first, derived from the track's tuning. Each
// `track.strings` entry is a `[stringNumber, midiPitch]` pair emitted by the
// parser; the second value is the open-string pitch. Percussion or untuned
// tracks have no strings and yield an empty list.
export function stringTuningLabels(track: Track): string[] {
  return track.strings.map(([, pitch]) => tuningNoteName(pitch));
}
