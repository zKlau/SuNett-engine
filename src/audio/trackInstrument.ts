import type { Song } from "../types/song";
import type { Track } from "../types/track";

/** Prefer explicit MIDI metadata; infer only when the parser omitted it. */
export function resolveTrackProgram(song: Song, track: Track): number {
  const explicit =
    track.midi_program_gpif ?? song.channels?.[track.channel_index]?.instrument;
  if (Number.isInteger(explicit) && explicit! >= 0 && explicit! <= 127) {
    return explicit!;
  }
  const name = track.name.toLowerCase();
  if (/\b(bass|bajo)\b/.test(name)) {
    return 33;
  }
  if (/distortion|overdrive|heavy|metal/.test(name)) {
    return 30;
  }
  if (/classical|nylon/.test(name)) {
    return 24;
  }
  if (/acoustic|steel/.test(name)) {
    return 25;
  }
  if (/guitar|guitare|guitarra/.test(name)) {
    return 27;
  }
  return 0;
}
