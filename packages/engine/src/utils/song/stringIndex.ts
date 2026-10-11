import type { Song } from "../../types/song";
import type { Track } from "../../types/track";

const GPIF_FORMAT_VERSION = 6;

/**
 * How far a note's `string` number sits from its 0-based index into
 * `track.strings`. Guitar Pro 6 and later number strings from 0 in tuning
 * order; Guitar Pro 3-5 number them like the tuning pairs, from 1. Songs
 * without a known format version are treated as 0-based.
 * @param song The song the track belongs to, for its format version.
 * @param track The track whose notes are resolved.
 * @returns The value to subtract from `note.string`.
 */
export function noteStringOffset(song: Song | undefined, track: Track): number {
  const major = song?.version?.number?.[0] ?? 0;
  if (major <= 0 || major >= GPIF_FORMAT_VERSION) {
    return 0;
  }
  return track.strings[0]?.[0] ?? 0;
}

/**
 * The 0-based index into `track.strings` of the string a note is played on.
 * @param song The song the track belongs to.
 * @param track The track the note belongs to.
 * @param noteString The note's `string` number.
 */
export function noteStringIndex(
  song: Song | undefined,
  track: Track,
  noteString: number,
): number {
  return noteString - noteStringOffset(song, track);
}

/**
 * The MIDI pitch of the open string a note is played on.
 * @param song The song the track belongs to.
 * @param track The track the note belongs to.
 * @param noteString The note's `string` number.
 * @returns The pitch, or `undefined` if the string does not exist.
 */
export function openStringPitch(
  song: Song | undefined,
  track: Track,
  noteString: number,
): number | undefined {
  return track.strings[noteStringIndex(song, track, noteString)]?.[1];
}
