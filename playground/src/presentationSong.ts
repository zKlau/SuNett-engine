import type { Beat, Measure, Note, Song, Track } from "../../packages/engine/src/index.ts";
import type { Duration, TimeSignature } from "../../packages/engine/src/types/duration.ts";

const TEMPO = 96;
const TICKS_PER_MEASURE = 3840;
const KEY = { key: 0, is_minor: true };
const QUARTER: Duration = {
  value: 4,
  dotted: false,
  double_dotted: false,
  min_time: 0,
  tuplet_enters: 1,
  tuplet_times: 1,
};
const TIME_SIGNATURE: TimeSignature = {
  numerator: 4,
  denominator: QUARTER,
  beams: [2, 2, 2, 2],
};
const ACOUSTIC_FRETS = [
  [0, 2, 2, 0, 0, 0, 2, 0],
  [3, 2, 0, 0, 3, 0, 0, 2],
  [0, 0, 2, 2, 1, 0, 1, 2],
  [0, 2, 2, 0, 0, 0, 2, 0],
];
const ACOUSTIC_STRINGS = [5, 4, 3, 2, 1, 0, 1, 2];
const ELECTRIC_FRETS = [
  [0, 0, 3, 5, 0, 0, 3, 5],
  [5, 7, 5, 7, 5, 3, 0, 3],
  [7, 9, 7, 5, 7, 5, 3, 5],
  [5, 3, 0, 3, 5, 3, 0, 0],
];
const ELECTRIC_STRINGS = [4, 4, 3, 3, 4, 4, 3, 3];

export function createPresentationSong(): Song {
  return {
    version: {
      data: "SuNett original demo",
      clipboard: false,
      number: [5, 1, 0],
    },
    name: "The Sunday Sessions",
    album: "",
    writer: "SuNett",
    artist: "SuNett",
    tempo: TEMPO,
    hide_tempo: false,
    tempo_name: "Easy going",
    measure_headers: ACOUSTIC_FRETS.map((_, index) => ({
      number: index + 1,
      start: index * TICKS_PER_MEASURE,
      time_signature: TIME_SIGNATURE,
      tempo: TEMPO,
      repeat_open: false,
      repeat_close: 0,
      repeat_alternative: 0,
      triplet_feel: "None",
      key_signature: KEY,
      double_bar: index === ACOUSTIC_FRETS.length - 1,
      fermatas: [],
      free_time: false,
    })),
    transcriber: "",
    channels: [],
    date: "",
    lyrics: { track_choice: 0, lines: [] },
    key: KEY,
    tracks: [
      createTrack("Acoustic guitar", 0, ACOUSTIC_FRETS, ACOUSTIC_STRINGS),
      createTrack("Electric guitar", 1, ELECTRIC_FRETS, ELECTRIC_STRINGS),
    ],
  };
}

function createTrack(
  name: string,
  index: number,
  measures: number[][],
  strings: number[],
): Track {
  return {
    number: index + 1,
    offset: 0,
    channel_index: index,
    solo: false,
    mute: false,
    visible: true,
    name,
    short_name: name,
    strings: [
      [0, 64],
      [1, 59],
      [2, 55],
      [3, 50],
      [4, 45],
      [5, 40],
    ],
    color: 0,
    percussion_track: false,
    twelve_stringed_guitar_track: false,
    banjo_track: false,
    port: 1,
    fret_count: 24,
    indicate_tuning: true,
    measures: measures.map((frets, measureIndex) =>
      createMeasure({ frets, strings, measureIndex, trackIndex: index }),
    ),
    settings: {
      tablature: true,
      notation: false,
      diagram_are_below: false,
      show_rythm: true,
      force_horizontal: false,
      force_channels: false,
      diagram_list: false,
      diagram_in_score: false,
      auto_let_ring: false,
      auto_brush: false,
      extend_rythmic: false,
    },
  };
}

function createMeasure(input: {
  frets: number[];
  strings: number[];
  measureIndex: number;
  trackIndex: number;
}): Measure {
  const { frets, strings, measureIndex, trackIndex } = input;
  return {
    number: measureIndex + 1,
    start: measureIndex * TICKS_PER_MEASURE,
    has_double_bar: measureIndex === 3,
    key_signature: KEY,
    time_signature: TIME_SIGNATURE,
    track_index: trackIndex,
    header_index: measureIndex,
    clef: "Treble",
    line_break: "None",
    voices: [
      {
        measure_index: measureIndex,
        direction: "Down",
        beats: frets.map((fret, beatIndex) => {
          const note = createNote(fret, strings[beatIndex]);
          if (trackIndex === 1) {
            note.effect.hammer = beatIndex === 2;
            note.effect.palm_mute = beatIndex < 2;
            note.effect.vibrato = measureIndex === 2 && beatIndex === 5;
          }
          return createBeat(note);
        }),
      },
    ],
  };
}

function createNote(value: number, string: number): Note {
  return {
    value,
    string,
    velocity: 88,
    duration_percent: 1,
    swap_accidentals: false,
    kind: "Normal",
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
  };
}

function createBeat(note: Note): Beat {
  return {
    notes: [note],
    duration: { ...QUARTER, value: 8 },
    text: "",
    octave: "None",
    status: "Normal",
    display: {
      break_beam: false,
      force_beam: false,
      beam_direction: "Down",
      tuplet_bracket: "None",
      break_secondary: 0,
      break_secondary_tuplet: false,
      force_bracket: false,
    },
    effect: {
      stroke: { direction: "None", value: 0, swap: false },
      has_rasgueado: false,
      pick_stroke: "None",
      chord: {
        length: 0,
        name: "",
        strings: [],
        barres: [],
        omissions: [],
        fingerings: [],
      } as unknown as Beat["effect"]["chord"],
      fade_in: false,
      tremolo_bar: {
        kind: "None",
        value: 0,
        points: [],
        semitone_length: 1,
        max_position: 60,
        max_value: 12,
      },
      mix_table_change: {
        rse: {
          instrument: 0,
          unknown: 0,
          sound_bank: 0,
          effect_number: 0,
          effect_category: "",
          effect: "",
        },
        tempo_name: "",
        hide_tempo: false,
        use_rse: false,
      },
      slap_effect: "None",
      vibrato: false,
    },
  };
}
