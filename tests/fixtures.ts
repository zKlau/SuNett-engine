// Minimal builders for the Guitar Pro domain model. Tests live outside `src`,
// so they are excluded from `tsc`/build/knip; the `as unknown as` casts keep
// fixtures small by only populating the fields the renderer actually reads.
import type { Measure } from "../src/types/measure";
import type { Song } from "../src/types/song";
import type { Track } from "../src/types/track";
import type { MeasureContext } from "../src/types/UI/measureContext";

export function makeMeasure(beatCount: number, notesPerBeat = 0): Measure {
  const beats = Array.from({ length: beatCount }, () => ({
    notes: Array.from({ length: notesPerBeat }, () => ({})),
  }));

  return {
    number: 1,
    has_double_bar: false,
    voices: [{ beats }],
  } as unknown as Measure;
}

export function makeTrack(
  stringCount: number,
  measures: Measure[],
  name = "Track",
): Track {
  return {
    name,
    strings: Array.from({ length: stringCount }, (_, index) => [index, 0]),
    measures,
  } as unknown as Track;
}

export function makeMeasureContext(
  measure: Measure,
  index: number,
): MeasureContext {
  return { measure, index };
}

export function makeSong(tracks: Track[], name = "Song"): Song {
  return {
    name,
    tracks,
    measure_headers: [],
  } as unknown as Song;
}
