import type { Beat } from "../src/types/beats/beat";
import type { Duration } from "../src/types/duration";
import type { Measure } from "../src/types/measure";
import type { Note } from "../src/types/note";
import type { Song } from "../src/types/song";
import type { Track } from "../src/types/track";
import type { MeasureBounds } from "../src/types/UI/measureBounds";
import type { MeasureContext } from "../src/types/UI/measureContext";
import type { BeatLayout } from "../src/types/UI/noteLayout";
import type { TabNoteOptions } from "../src/types/UI/tabNoteOptions";
import { normalizeOptions } from "../src/utils/tabs/tabsOptionsNormalizer";

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

export function makeMeasureFromVoices(voicesBeats: Beat[][]): Measure {
  return {
    number: 1,
    has_double_bar: false,
    voices: voicesBeats.map((beats) => ({ beats })),
  } as unknown as Measure;
}

export function makeTrack(
  stringCount: number,
  measures: Measure[],
  name = "Track",
  percussion = false,
): Track {
  return {
    name,
    strings: Array.from({ length: stringCount }, (_, index) => [index, 0]),
    percussion_track: percussion,
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

export function makeDuration(overrides: Partial<Duration> = {}): Duration {
  return {
    value: 4,
    dotted: false,
    double_dotted: false,
    min_time: 0,
    tuplet_enters: 1,
    tuplet_times: 1,
    ...overrides,
  };
}

export function makeBeat(overrides: Partial<Beat> = {}): Beat {
  return {
    notes: [],
    duration: makeDuration(),
    text: "",
    status: "Normal",
    ...overrides,
  } as unknown as Beat;
}

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    value: 0,
    velocity: 0,
    string: 1,
    kind: "Normal",
    duration_percent: 1,
    swap_accidentals: false,
    effect: {
      accentuated_note: false,
      ghost_note: false,
      hammer: false,
      heavy_accentuated_note: false,
      left_hand_finger: "Open",
      let_ring: false,
      palm_mute: false,
      right_hand_finger: "Open",
      slides: [],
      staccato: false,
      vibrato: false,
    },
    ...overrides,
  } as unknown as Note;
}

export function makeBounds(
  overrides: Partial<MeasureBounds> = {},
): MeasureBounds {
  return {
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    stringSpacing: 10,
    isLastMeasure: false,
    ...overrides,
  };
}

export function makeBeatLayout(
  overrides: Partial<BeatLayout> = {},
): BeatLayout {
  return {
    beatIndex: 0,
    voiceIndex: 0,
    x: 50,
    width: 100,
    ...overrides,
  };
}

export function makeNoteConfig(overrides: TabNoteOptions = {}) {
  return normalizeOptions({ notes: overrides }).notes;
}
