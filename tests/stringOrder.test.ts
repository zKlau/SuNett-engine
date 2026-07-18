import type { Track } from "../src/types/track";
import {
  shouldReverseStrings,
  stringDisplayRow,
} from "../src/utils/tabs/stringOrder";

function trackWithTuning(tuning: [number, number][]): Track {
  return { strings: tuning } as unknown as Track;
}

describe("shouldReverseStrings", () => {
  it("reverses a lowest-first (ascending) tuning, e.g. GPIF", () => {
    const track = trackWithTuning([
      [1, 30],
      [2, 35],
      [3, 40],
      [4, 45],
      [5, 50],
      [6, 54],
      [7, 59],
    ]);

    expect(shouldReverseStrings(track)).toBe(true);
  });

  it("keeps a highest-first (descending) tuning, e.g. .gp5", () => {
    const track = trackWithTuning([
      [1, 64],
      [2, 59],
      [3, 55],
      [4, 50],
      [5, 45],
      [6, 40],
    ]);

    expect(shouldReverseStrings(track)).toBe(false);
  });

  it("does not reverse a single-string or empty track", () => {
    expect(shouldReverseStrings(trackWithTuning([[1, 40]]))).toBe(false);
    expect(shouldReverseStrings(trackWithTuning([]))).toBe(false);
  });
});

describe("stringDisplayRow", () => {
  const stringCount = 6;

  it("maps a zero-based string index to the same row without flips", () => {
    expect(stringDisplayRow(0, stringCount, false, false)).toBe(0);
    expect(stringDisplayRow(5, stringCount, false, false)).toBe(5);
  });

  it("mirrors when reversing (thinnest string moves to the top)", () => {
    expect(stringDisplayRow(0, stringCount, true, false)).toBe(5);
    expect(stringDisplayRow(5, stringCount, true, false)).toBe(0);
  });

  it("mirrors when inverting", () => {
    expect(stringDisplayRow(0, stringCount, false, true)).toBe(5);
    expect(stringDisplayRow(5, stringCount, false, true)).toBe(0);
  });

  it("cancels out when reverse and invert are both set", () => {
    expect(stringDisplayRow(0, stringCount, true, true)).toBe(0);
    expect(stringDisplayRow(5, stringCount, true, true)).toBe(5);
  });
});
