import {
  measureIndicesForRows,
  visibleRowRange,
} from "../src/utils/tabs/measureWindow";
import type { TabLayout } from "../src/types/UI/tabLayout";

function layoutWith(
  rowCount: number,
  rowHeight = 100,
  paddingY = 10,
): TabLayout {
  const measureLayouts = Array.from({ length: rowCount }, (_, row) => ({
    x: 0,
    y: paddingY + row * rowHeight,
    width: 100,
    row,
  }));

  return {
    measureLayouts,
    rowCount,
    rowHeight,
    paddingY,
    stringCount: 6,
    stringSpacing: 20,
    measureHeight: rowHeight,
    contentWidth: 100,
    measureGap: 0,
    paddingX: 10,
    tuningGutter: 0,
  };
}

describe("visibleRowRange", () => {
  it("returns rows near the top when the tab starts at the viewport top", () => {
    const layout = layoutWith(20);
    const range = visibleRowRange(
      { top: 0, bottom: 2010 },
      { top: 0, bottom: 300 },
      layout,
      2010,
      2,
    );

    expect(range.minRow).toBe(0);
    expect(range.maxRow).toBe(4);
  });

  it("tracks the visible rows as the tab scrolls up past the viewport", () => {
    const layout = layoutWith(20);
    const range = visibleRowRange(
      { top: -1500, bottom: 510 },
      { top: 0, bottom: 300 },
      layout,
      2010,
      2,
    );

    expect(range.minRow).toBe(12);
    expect(range.maxRow).toBe(19);
  });

  it("maps client px back to user space when the svg is scaled down", () => {
    const layout = layoutWith(20);
    const scaled = visibleRowRange(
      { top: 0, bottom: 1005 },
      { top: 0, bottom: 300 },
      layout,
      2010,
      0,
    );

    expect(scaled.maxRow).toBe(5);
  });

  it("falls back to the full range before the svg has been laid out", () => {
    const layout = layoutWith(20);
    const range = visibleRowRange(
      { top: 0, bottom: 0 },
      { top: 0, bottom: 300 },
      layout,
      0,
      2,
    );

    expect(range).toEqual({ minRow: 0, maxRow: 19 });
  });
});

describe("measureIndicesForRows", () => {
  it("returns the first and last measure indices within the row range", () => {
    const layout = layoutWith(10);

    expect(measureIndicesForRows(layout, { minRow: 3, maxRow: 6 })).toEqual({
      first: 3,
      last: 6,
    });
  });

  it("returns undefined when no measure falls in the range", () => {
    const layout = layoutWith(5);

    expect(
      measureIndicesForRows(layout, { minRow: 8, maxRow: 9 }),
    ).toBeUndefined();
  });
});
