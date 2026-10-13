import type { Track } from "../src/types/track";
import {
  stringTuningLabels,
  tuningNoteName,
} from "../src/utils/tabs/stringTuning";

function trackWithTuning(tuning: [number, number][]): Track {
  return { strings: tuning } as unknown as Track;
}

describe("tuningNoteName", () => {
  it("maps standard-tuning MIDI pitches to note names", () => {
    expect(tuningNoteName(64)).toBe("E");
    expect(tuningNoteName(59)).toBe("B");
    expect(tuningNoteName(55)).toBe("G");
    expect(tuningNoteName(50)).toBe("D");
    expect(tuningNoteName(45)).toBe("A");
    expect(tuningNoteName(40)).toBe("E");
  });

  it("returns sharps for accidental pitches", () => {
    expect(tuningNoteName(61)).toBe("C#");
    expect(tuningNoteName(42)).toBe("F#");
  });

  it("is octave-independent (same class, different octave)", () => {
    expect(tuningNoteName(0)).toBe("C");
    expect(tuningNoteName(12)).toBe("C");
    expect(tuningNoteName(60)).toBe("C");
  });

  it("handles a drop-D low string", () => {
    expect(tuningNoteName(38)).toBe("D");
  });
});

describe("stringTuningLabels", () => {
  it("labels a standard 6-string tuning top line first", () => {
    const track = trackWithTuning([
      [1, 64],
      [2, 59],
      [3, 55],
      [4, 50],
      [5, 45],
      [6, 40],
    ]);

    expect(stringTuningLabels(track)).toEqual(["E", "B", "G", "D", "A", "E"]);
  });

  it("labels a 4-string bass tuning", () => {
    const track = trackWithTuning([
      [1, 43],
      [2, 38],
      [3, 33],
      [4, 28],
    ]);

    expect(stringTuningLabels(track)).toEqual(["G", "D", "A", "E"]);
  });

  it("returns an empty list for a track with no strings", () => {
    expect(stringTuningLabels(trackWithTuning([]))).toEqual([]);
  });
});
