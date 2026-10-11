import type { Beat } from "../src/types/beats/beat";
import type { Measure } from "../src/types/measure";
import type { Song } from "../src/types/song";
import type { Track } from "../src/types/track";
import {
  beatsAt,
  buildBeatTimeline,
  nextBeatStart,
  previousBeatStart,
} from "../src/utils/timing/beatTimeline";
import { buildSongTimeline } from "../src/utils/timing/measureTimeline";
import { durationInWholeNotes } from "../src/utils/timing/durationLength";
import { makeBeat, makeDuration } from "./fixtures";

function makeMeasure(voices: Beat[][], numerator = 4, denominator = 4) {
  return {
    time_signature: { numerator, denominator: { value: denominator } },
    voices: voices.map((beats) => ({ beats })),
  } as unknown as Measure;
}

function quarter(): Beat {
  return makeBeat({ duration: makeDuration({ value: 4 }) });
}

function eighth(): Beat {
  return makeBeat({ duration: makeDuration({ value: 8 }) });
}

function timelineOf(measures: Measure[], tempo = 120) {
  const track = { measures } as unknown as Track;
  const song = { tempo, measure_headers: [] } as unknown as Song;
  return buildBeatTimeline(track, buildSongTimeline(song, track));
}

describe("durationInWholeNotes", () => {
  it("accounts for dots and tuplets", () => {
    expect(durationInWholeNotes(makeDuration({ value: 4 }))).toBe(0.25);
    expect(durationInWholeNotes(makeDuration({ value: 8, dotted: true }))).toBe(
      0.1875,
    );
    expect(
      durationInWholeNotes(
        makeDuration({ value: 8, tuplet_enters: 3, tuplet_times: 2 }),
      ),
    ).toBeCloseTo(1 / 12);
  });
});

describe("buildBeatTimeline", () => {
  it("places beats by duration within each measure", () => {
    const timeline = timelineOf([
      makeMeasure([[quarter(), quarter(), eighth(), eighth(), quarter()]]),
      makeMeasure([[quarter()]]),
    ]);

    expect(
      timeline.beats.map(({ startMs, endMs }) => [startMs, endMs]),
    ).toEqual([
      [0, 500],
      [500, 1000],
      [1000, 1250],
      [1250, 1500],
      [1500, 2000],
      [2000, 2500],
    ]);
    expect(timeline.beats[5]).toMatchObject({
      measureIndex: 1,
      voiceIndex: 0,
      beatIndex: 0,
    });
    expect(timeline.maxBeatDurationMs).toBe(500);
  });

  it("orders beats of several voices by start time", () => {
    const timeline = timelineOf([
      makeMeasure([
        [quarter(), quarter()],
        [eighth(), eighth()],
      ]),
    ]);

    expect(
      timeline.beats.map(({ voiceIndex, startMs }) => [voiceIndex, startMs]),
    ).toEqual([
      [0, 0],
      [1, 0],
      [1, 250],
      [0, 500],
    ]);
  });

  it("clamps beats that overflow their measure", () => {
    const timeline = timelineOf([makeMeasure([[quarter(), quarter()]], 1, 4)]);

    expect(timeline.beats[1]).toMatchObject({ startMs: 500, endMs: 500 });
  });
});

describe("beat lookups", () => {
  const timeline = timelineOf([
    makeMeasure([
      [quarter(), quarter(), quarter(), quarter()],
      [eighth(), eighth()],
    ]),
  ]);

  it("returns the beats sounding at a time, one per voice", () => {
    expect(
      beatsAt(timeline, 300).map(({ voiceIndex, beatIndex }) => [
        voiceIndex,
        beatIndex,
      ]),
    ).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(beatsAt(timeline, 1200).map(({ beatIndex }) => beatIndex)).toEqual([
      2,
    ]);
    expect(beatsAt(timeline, 5000)).toEqual([]);
  });

  it("finds the next and previous beat starts", () => {
    expect(nextBeatStart(timeline, 0)).toBe(250);
    expect(nextBeatStart(timeline, 250)).toBe(500);
    expect(nextBeatStart(timeline, 1500)).toBeUndefined();
    expect(previousBeatStart(timeline, 500)).toBe(250);
    expect(previousBeatStart(timeline, 0)).toBeUndefined();
  });
});
