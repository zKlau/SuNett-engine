import type { Track } from "../../types/track";

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

export function tuningNoteName(pitch: number): string {
  const index = ((Math.trunc(pitch) % 12) + 12) % 12;
  return NOTE_NAMES[index];
}

export function stringTuningLabels(track: Track): string[] {
  return track.strings.map(([, pitch]) => tuningNoteName(pitch));
}
