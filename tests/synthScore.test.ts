import { compileSynthScore, durationInQuarters } from "../src/audio/songScore";
import {
  makeBeat,
  makeDuration,
  makeMeasureFromVoices,
  makeNote,
  makeSong,
  makeTrack,
} from "./fixtures";
import type { MeasureHeader } from "../src/types/measure";

function fixture() {
  const note = makeNote({ string: 0, value: 5, velocity: 100 });
  const measure = makeMeasureFromVoices([[makeBeat({ notes: [note] })]]);
  measure.time_signature = {
    numerator: 4,
    denominator: makeDuration(),
    beams: [],
  };
  measure.start = 960;
  const track = makeTrack(2, [measure]);
  track.strings = [
    [1, 64],
    [2, 59],
  ];
  track.offset = 0;
  const song = makeSong([track]);
  song.tempo = 120;
  return { note, measure, track, song };
}

it("converts tuning plus fret plus capo to MIDI and ignores tuple label numbering", () => {
  const { song, track } = fixture();
  track.offset = 2;
  expect(compileSynthScore(song).notes[0]).toMatchObject({
    midi: 71,
    startMs: 0,
    endMs: 500,
  });
});

it("uses percussion values directly without tuning or capo", () => {
  const { song, track, note } = fixture();
  track.percussion_track = true;
  track.offset = 4;
  note.value = 38;
  expect(compileSynthScore(song).notes[0].midi).toBe(38);
});

it("computes dotted and tuplet lengths, with double dots taking precedence", () => {
  expect(durationInQuarters(makeDuration({ dotted: true }))).toBe(1.5);
  expect(
    durationInQuarters(makeDuration({ dotted: true, double_dotted: true })),
  ).toBe(1.75);
  expect(
    durationInQuarters(
      makeDuration({ value: 8, tuplet_enters: 3, tuplet_times: 2 }),
    ),
  ).toBeCloseTo(1 / 3);
});

it("preserves rests, chords, and independent voices", () => {
  const { song, measure, note } = fixture();
  measure.voices[0].beats = [
    makeBeat({ status: "Rest" }),
    makeBeat({ notes: [note, { ...note, string: 1 }] }),
  ];
  measure.voices.push({
    direction: "None",
    measure_index: 0,
    beats: [makeBeat({ notes: [note] })],
  });
  expect(compileSynthScore(song).notes.map((n) => n.startMs)).toEqual([
    0, 500, 500,
  ]);
});

it("honors explicit GP tick offsets and rejects invalid pitches", () => {
  const { song, measure, note } = fixture();
  measure.voices[0].beats = [
    makeBeat({ start: 2880, notes: [note, { ...note, string: 99 }] }),
  ];
  const { notes } = compileSynthScore(song);
  expect(notes).toHaveLength(1);
  expect(notes[0].startMs).toBe(1000);
});

it("extends a tie across a measure without retriggering", () => {
  const { song, track, measure, note } = fixture();
  measure.voices[0].beats[0].duration.value = 1;
  const next = {
    ...measure,
    start: 4800,
    voices: [
      {
        direction: "None" as const,
        measure_index: 1,
        beats: [makeBeat({ notes: [{ ...note, kind: "Tie" }] })],
      },
    ],
  };
  track.measures.push(next);
  const { notes } = compileSynthScore(song);
  expect(notes).toHaveLength(1);
  expect(notes[0].endMs).toBe(2500);
});

it("does not tie across a rest", () => {
  const { song, measure, note } = fixture();
  measure.voices[0].beats.push(
    makeBeat({ status: "Rest" }),
    makeBeat({ notes: [{ ...note, kind: "Tie" }] }),
  );
  expect(compileSynthScore(song).notes[0].endMs).toBe(500);
});

it("carries a tempo change into following measures with no new tempo", () => {
  const { song, track, measure } = fixture();
  track.measures = [measure, { ...measure }, { ...measure }];
  song.measure_headers = [120, 60, 0].map(
    (tempo) => ({ tempo }) as MeasureHeader,
  );
  expect(compileSynthScore(song).durationMs).toBe(10000);
  expect(compileSynthScore(song).notes.map((n) => n.startMs)).toEqual([
    0, 2000, 6000,
  ]);
});

it("handles a non-quarter denominator and bounds notes to the measure", () => {
  const { song, measure } = fixture();
  measure.time_signature.numerator = 6;
  measure.time_signature.denominator.value = 8;
  measure.voices[0].beats[0].duration.value = 1;
  const score = compileSynthScore(song);
  expect(score.durationMs).toBe(1500);
  expect(score.notes[0].endMs).toBe(1500);
});

it("keeps silent velocity and shortens staccato notes", () => {
  const { song, note } = fixture();
  note.velocity = 0;
  note.effect.staccato = true;
  expect(compileSynthScore(song).notes[0]).toMatchObject({
    velocity: 0,
    endMs: 250,
  });
});

it("preserves distinct palm mute, dead-note and vibrato performance data", () => {
  const { song, note } = fixture();
  note.effect.palm_mute = true;
  note.effect.vibrato = true;
  expect(compileSynthScore(song).notes[0]).toMatchObject({
    articulation: "palm-mute",
    vibrato: true,
    stringIndex: 0,
  });
  note.kind = "Dead";
  expect(compileSynthScore(song).notes[0].articulation).toBe("dead");
});

it("turns quarter-tone bend points into timed cents", () => {
  const { song, note } = fixture();
  note.effect.bend = {
    kind: "Bend",
    value: 100,
    semitone_length: 1,
    max_position: 12,
    max_value: 12,
    points: [
      { position: 0, value: 0, vibrato: false },
      { position: 12, value: 4, vibrato: false },
    ],
  };
  expect(compileSynthScore(song).notes[0].pitch).toEqual([
    { offsetMs: 0, cents: 0 },
    { offsetMs: 500, cents: 200 },
  ]);
});

it("slides to the next note on the same string and selects hammer attacks", () => {
  const { song, note, measure } = fixture();
  note.effect.slides = ["LegatoSlideTo"];
  note.effect.hammer = true;
  const destination = makeNote({ string: 0, value: 7 });
  measure.voices[0].beats.push(makeBeat({ notes: [destination] }));
  const notes = compileSynthScore(song).notes;
  expect(notes[0].pitch?.slice(-1)[0]).toEqual({ offsetMs: 500, cents: 200 });
  expect(notes[1].articulation).toBe("hammer");
});

it("lets a string ring until its next note and plays natural harmonics at sounding pitch", () => {
  const { song, note, measure } = fixture();
  note.effect.let_ring = true;
  note.effect.harmonic = { kind: "Natural" };
  note.value = 7;
  measure.voices[0].beats.push(
    makeBeat({ status: "Rest" }),
    makeBeat({ notes: [makeNote({ string: 0, value: 0 })] }),
  );
  const notes = compileSynthScore(song).notes;
  expect(notes[0].midi).toBe(83);
  expect(notes[0].endMs).toBe(1000);
});

it("realizes downstrokes from low string to high without moving the beat endpoint", () => {
  const { song, measure, note } = fixture();
  const beat = measure.voices[0].beats[0];
  beat.notes = [note, makeNote({ string: 1, value: 5, velocity: 100 })];
  beat.effect = {
    ...beat.effect,
    stroke: { direction: "Down", value: 16, swap: false },
  };
  const notes = compileSynthScore(song).notes;
  expect(notes.map((n) => n.stringIndex)).toEqual([1, 0]);
  expect(notes.map((n) => n.startMs)).toEqual([0, 125]);
  expect(notes.map((n) => n.endMs)).toEqual([500, 500]);
});

it("expands tremolo picking and alternating trill frets at their notated rate", () => {
  const { song, note } = fixture();
  note.effect.tremolo_picking = { duration: makeDuration({ value: 16 }) };
  expect(compileSynthScore(song).notes.map((n) => [n.startMs, n.midi])).toEqual(
    [
      [0, 69],
      [125, 69],
      [250, 69],
      [375, 69],
    ],
  );
  note.effect.trill = { fret: 7, duration: makeDuration({ value: 16 }) };
  expect(compileSynthScore(song).notes.map((n) => n.midi)).toEqual([
    69, 71, 69, 71,
  ]);
});

it("places an on-beat grace before the main attack without extending the beat", () => {
  const { song, note } = fixture();
  note.effect.grace = {
    fret: 3,
    duration: 32,
    velocity: 80,
    is_dead: false,
    is_on_beat: true,
    transition: "Hammer",
  };
  expect(compileSynthScore(song).notes).toMatchObject([
    { midi: 67, startMs: 0, endMs: 62.5 },
    { midi: 69, startMs: 62.5, endMs: 500, articulation: "hammer" },
  ]);
});

it("keeps explicit GPIF and channel program zero instead of guessing from the name", () => {
  const { song, track } = fixture();
  track.name = "Distortion guitar";
  track.midi_program_gpif = 0;
  expect(compileSynthScore(song).notes[0].instrument).toBe(0);
  track.midi_program_gpif = 33;
  expect(compileSynthScore(song).notes[0].instrument).toBe(33);
});
