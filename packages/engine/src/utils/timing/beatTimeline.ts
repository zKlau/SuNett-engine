import type { Beat } from "../../types/beats/beat";
import type { Track } from "../../types/track";
import type { SongTimeline } from "./measureTimeline";
import { measureLengthInWholeNotes } from "./measureTimeline";
import { durationInWholeNotes } from "./durationLength";

/** Where one beat of one voice sits in song time. */
export type BeatTiming = {
  measureIndex: number;
  voiceIndex: number;
  beatIndex: number;
  /** Song time the beat starts at, in milliseconds. */
  startMs: number;
  /** Song time the beat ends at, clamped to its measure's end. */
  endMs: number;
  beat: Beat;
};

/** Every beat of a track in song time, ordered by start time. */
export type BeatTimeline = {
  beats: BeatTiming[];
  /** The longest single beat, used to bound lookups. */
  maxBeatDurationMs: number;
};

/**
 * Places every beat of every voice of a track on the song's time axis, using
 * each beat's note duration and its measure's tempo and time signature.
 * @param track The track whose beats are timed.
 * @param songTimeline The measure timeline of the same track.
 * @returns The beats ordered by start time, then measure, voice and beat index.
 */
export function buildBeatTimeline(
  track: Track,
  songTimeline: SongTimeline,
): BeatTimeline {
  const beats: BeatTiming[] = [];

  track.measures.forEach((measure, measureIndex) => {
    const timing = songTimeline.measures[measureIndex];
    if (!timing) {
      return;
    }
    const wholeNoteMs = timing.durationMs / measureLengthInWholeNotes(measure);

    measure.voices.forEach((voice, voiceIndex) => {
      let cursorMs = timing.startMs;
      voice.beats.forEach((beat, beatIndex) => {
        const startMs = Math.min(cursorMs, timing.endMs);
        const endMs = Math.min(
          cursorMs + durationInWholeNotes(beat.duration) * wholeNoteMs,
          timing.endMs,
        );
        beats.push({
          measureIndex,
          voiceIndex,
          beatIndex,
          startMs,
          endMs,
          beat,
        });
        cursorMs = endMs;
      });
    });
  });

  beats.sort(compareBeats);
  const maxBeatDurationMs = beats.reduce(
    (longest, timing) => Math.max(longest, timing.endMs - timing.startMs),
    0,
  );
  return { beats, maxBeatDurationMs };
}

/**
 * The beats sounding at a song time: those that start at or before `ms` and
 * end after it, at most one per voice.
 * @param timeline The beat timeline to search.
 * @param ms The song time in milliseconds.
 * @returns The matching beats in timeline order.
 */
export function beatsAt(timeline: BeatTimeline, ms: number): BeatTiming[] {
  const { beats, maxBeatDurationMs } = timeline;
  const found: BeatTiming[] = [];
  for (let index = lastStartingAtOrBefore(beats, ms); index >= 0; index -= 1) {
    const timing = beats[index];
    if (timing.startMs < ms - maxBeatDurationMs) {
      break;
    }
    if (timing.endMs > ms) {
      found.push(timing);
    }
  }
  return found.reverse();
}

/**
 * The start time of the first beat that begins strictly after `ms`.
 * @param timeline The beat timeline to search.
 * @param ms The song time in milliseconds.
 * @returns The next beat start, or `undefined` past the last beat.
 */
export function nextBeatStart(
  timeline: BeatTimeline,
  ms: number,
): number | undefined {
  return timeline.beats[lastStartingAtOrBefore(timeline.beats, ms) + 1]
    ?.startMs;
}

/**
 * The start time of the last beat that begins strictly before `ms`.
 * @param timeline The beat timeline to search.
 * @param ms The song time in milliseconds.
 * @returns The previous beat start, or `undefined` before the first beat.
 */
export function previousBeatStart(
  timeline: BeatTimeline,
  ms: number,
): number | undefined {
  const { beats } = timeline;
  for (let index = lastStartingAtOrBefore(beats, ms); index >= 0; index -= 1) {
    if (beats[index].startMs < ms) {
      return beats[index].startMs;
    }
  }
  return undefined;
}

function lastStartingAtOrBefore(beats: BeatTiming[], ms: number): number {
  let low = 0;
  let high = beats.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (beats[middle].startMs <= ms) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

function compareBeats(a: BeatTiming, b: BeatTiming): number {
  return (
    a.startMs - b.startMs ||
    a.measureIndex - b.measureIndex ||
    a.voiceIndex - b.voiceIndex ||
    a.beatIndex - b.beatIndex
  );
}
