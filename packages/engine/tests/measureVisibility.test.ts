import {
  measureHasNotes,
  visibleMeasureRange,
} from "../src/utils/tabs/measureVisibility";
import { makeMeasure } from "./fixtures";

const empty = () => makeMeasure(2, 0);
const full = () => makeMeasure(2, 1);

function contexts(measures: ReturnType<typeof makeMeasure>[]) {
  return measures.map((measure, index) => ({ measure, index }));
}

describe("measureHasNotes", () => {
  it("is false for a measure with no notes", () => {
    expect(measureHasNotes(empty())).toBe(false);
  });

  it("is true for a measure that has notes", () => {
    expect(measureHasNotes(full())).toBe(true);
  });
});

describe("visibleMeasureRange", () => {
  it("trims leading empty measures", () => {
    const result = visibleMeasureRange(
      contexts([empty(), empty(), full(), full()]),
    );
    expect(result.map((m) => m.index)).toEqual([2, 3]);
  });

  it("trims trailing empty measures", () => {
    const result = visibleMeasureRange(
      contexts([full(), full(), empty(), empty()]),
    );
    expect(result.map((m) => m.index)).toEqual([0, 1]);
  });

  it("trims both leading and trailing empty measures", () => {
    const result = visibleMeasureRange(
      contexts([empty(), full(), full(), empty()]),
    );
    expect(result.map((m) => m.index)).toEqual([1, 2]);
  });

  it("keeps empty measures that sit between non-empty ones", () => {
    const result = visibleMeasureRange(
      contexts([empty(), full(), empty(), full(), empty()]),
    );
    expect(result.map((m) => m.index)).toEqual([1, 2, 3]);
  });

  it("returns everything when no measure is empty", () => {
    const result = visibleMeasureRange(contexts([full(), full()]));
    expect(result.map((m) => m.index)).toEqual([0, 1]);
  });

  it("returns everything when every measure is empty", () => {
    const result = visibleMeasureRange(contexts([empty(), empty()]));
    expect(result.map((m) => m.index)).toEqual([0, 1]);
  });
});
