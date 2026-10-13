import type { Song } from "../types/song";
import type { Track } from "../types/track";

const DEFAULT_MIDI_PROGRAM = 0;
const BASS_MIDI_PROGRAM = 33;
const DISTORTION_GUITAR_PROGRAM = 30;
const NYLON_GUITAR_PROGRAM = 24;
const STEEL_GUITAR_PROGRAM = 25;
const ELECTRIC_GUITAR_PROGRAM = 27;

const INSTRUMENT_NAME_PATTERNS = [
  { pattern: /\b(bass|bajo)\b/, program: BASS_MIDI_PROGRAM },
  {
    pattern: /distortion|overdrive|heavy|metal/,
    program: DISTORTION_GUITAR_PROGRAM,
  },
  { pattern: /classical|nylon/, program: NYLON_GUITAR_PROGRAM },
  { pattern: /acoustic|steel/, program: STEEL_GUITAR_PROGRAM },
  { pattern: /guitar|guitare|guitarra/, program: ELECTRIC_GUITAR_PROGRAM },
];

/** Prefer explicit MIDI metadata; infer only when the parser omitted it. */
export function resolveTrackProgram(song: Song, track: Track): number {
  const explicit =
    track.midi_program_gpif ?? song.channels?.[track.channel_index]?.instrument;
  if (
    typeof explicit === "number" &&
    Number.isInteger(explicit) &&
    explicit >= 0 &&
    explicit <= 127
  ) {
    return explicit;
  }
  const name = track.name.toLowerCase();
  for (const entry of INSTRUMENT_NAME_PATTERNS) {
    if (entry.pattern.test(name)) {
      return entry.program;
    }
  }
  return DEFAULT_MIDI_PROGRAM;
}
