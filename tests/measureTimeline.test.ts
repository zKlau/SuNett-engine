import type { Measure } from "../src/types/measure";
import type { Song } from "../src/types/song";
import type { Track } from "../src/types/track";
import { buildSongTimeline } from "../src/utils/timing/measureTimeline";

function makeMeasure(numerator = 4, denominator = 4): Measure {
  return {
    time_signature: {
      numerator,
      denominator: { value: denominator },
    },
  } as unknown as Measure;
}

function makeTrack(measures: Measure[]): Track {
  return { measures } as unknown as Track;
}

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    tempo: 120,
    measure_headers: [],
    ...overrides,
  } as unknown as Song;
}

describe("buildSongTimeline", () => {
  it("derives measure duration from tempo and time signature", () => {
    const track = makeTrack([makeMeasure(4, 4)]);
    const timeline = buildSongTimeline(makeSong({ tempo: 120 }), track);

    expect(timeline.measures[0]).toEqual({
      index: 0,
      startMs: 0,
      endMs: 2000,
      durationMs: 2000,
    });
    expect(timeline.durationMs).toBe(2000);
  });

  it("chains consecutive measures end to start", () => {
    const track = makeTrack([makeMeasure(4, 4), makeMeasure(4, 4)]);
    const timeline = buildSongTimeline(makeSong({ tempo: 120 }), track);

    expect(timeline.measures.map((m) => [m.startMs, m.endMs])).toEqual([
      [0, 2000],
      [2000, 4000],
    ]);
  });

  it("scales duration with the time signature", () => {
    const track = makeTrack([makeMeasure(3, 4), makeMeasure(6, 8)]);
    const timeline = buildSongTimeline(makeSong({ tempo: 120 }), track);

    expect(timeline.measures[0].durationMs).toBeCloseTo(1500);
    expect(timeline.measures[1].durationMs).toBeCloseTo(1500);
  });

  it("prefers a per-measure header tempo over the song tempo", () => {
    const track = makeTrack([makeMeasure(4, 4)]);
    const song = makeSong({
      tempo: 120,
      measure_headers: [{ tempo: 60 }],
    } as unknown as Partial<Song>);

    expect(buildSongTimeline(song, track).measures[0].durationMs).toBe(4000);
  });

  it("falls back to a default tempo when none is valid", () => {
    const track = makeTrack([makeMeasure(4, 4)]);
    const song = makeSong({ tempo: 0 });

    expect(buildSongTimeline(song, track).measures[0].durationMs).toBe(2000);
  });

  it("resolves the header via header_index when the position is unset", () => {
    const second = makeMeasure(4, 4);
    (second as unknown as { header_index: number }).header_index = 0;
    const track = makeTrack([makeMeasure(4, 4), second]);
    const song = makeSong({
      tempo: 120,
      measure_headers: [{ tempo: 60 }],
    } as unknown as Partial<Song>);

    const timeline = buildSongTimeline(song, track);

    expect(timeline.measures[0].durationMs).toBe(4000);
    expect(timeline.measures[1].durationMs).toBe(4000);
  });
});
