import type { Measure } from "../../types/measure";
import type { Song } from "../../types/song";
import type { Track } from "../../types/track";

const MS_PER_MINUTE = 60_000;
const DEFAULT_TEMPO = 120;
const DEFAULT_NUMERATOR = 4;
const DEFAULT_DENOMINATOR = 4;
const QUARTER_NOTE = 4;

export type MeasureTiming = {
  index: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  beatCount: number;
  beatDurationMs: number;
};

export type SongTimeline = {
  measures: MeasureTiming[];
  durationMs: number;
};

export function buildSongTimeline(song: Song, track: Track): SongTimeline {
  const measures: MeasureTiming[] = [];
  let cursorMs = 0;
  let tempo = resolveTempo(undefined, song.tempo);

  track.measures.forEach((measure, index) => {
    const header =
      song.measure_headers[index] ?? song.measure_headers[measure.header_index];
    tempo = resolveTempo(header?.tempo, tempo);
    const beatCount = numeratorOf(measure);
    const durationMs = measureDurationMs(measure, tempo);
    const startMs = cursorMs;
    const endMs = startMs + durationMs;

    measures.push({
      index,
      startMs,
      endMs,
      durationMs,
      beatCount,
      beatDurationMs: durationMs / beatCount,
    });
    cursorMs = endMs;
  });

  return { measures, durationMs: cursorMs };
}

/**
 * The length of a measure's time signature as a fraction of a whole note, e.g.
 * `0.75` for 3/4 and `1` for 4/4. Missing or invalid signatures count as 4/4.
 * @param measure The measure to inspect.
 * @returns The measure length in whole notes.
 */
export function measureLengthInWholeNotes(measure: Measure): number {
  return numeratorOf(measure) / denominatorOf(measure);
}

function resolveTempo(
  headerTempo: number | undefined,
  songTempo: number,
): number {
  if (isPositive(headerTempo)) {
    return headerTempo;
  }
  return isPositive(songTempo) ? songTempo : DEFAULT_TEMPO;
}

function measureDurationMs(measure: Measure, tempo: number): number {
  const numerator = numeratorOf(measure);
  const denominator = denominatorOf(measure);
  const quarterNotes = (numerator * QUARTER_NOTE) / denominator;
  return quarterNotes * (MS_PER_MINUTE / tempo);
}

function numeratorOf(measure: Measure): number {
  const numerator = measure.time_signature?.numerator;
  return isPositive(numerator) ? numerator : DEFAULT_NUMERATOR;
}

function denominatorOf(measure: Measure): number {
  const denominator = measure.time_signature?.denominator?.value;
  return isPositive(denominator) ? denominator : DEFAULT_DENOMINATOR;
}

function isPositive(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
