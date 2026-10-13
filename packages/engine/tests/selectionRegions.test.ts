import { computeSelectionRegions } from "../src/selection/selectionRegions";
import type { SelectionLayoutContext } from "../src/selection/selectionRegions";
import type { Selection } from "../src/types/selection";

function makeContext(
  overrides: Partial<SelectionLayoutContext> = {},
): SelectionLayoutContext {
  return {
    timeline: {
      durationMs: 4000,
      measures: [
        {
          index: 0,
          startMs: 0,
          endMs: 2000,
          durationMs: 2000,
          beatCount: 4,
          beatDurationMs: 500,
        },
        {
          index: 1,
          startMs: 2000,
          endMs: 4000,
          durationMs: 2000,
          beatCount: 4,
          beatDurationMs: 500,
        },
      ],
    },
    measures: [
      { index: 0, layout: { x: 0, y: 0, width: 100, row: 0 } },
      { index: 1, layout: { x: 100, y: 0, width: 100, row: 0 } },
    ],
    measureHeight: 100,
    topPadding: 10,
    bottomPadding: 10,
    labelOffset: 6,
    minWidth: 2,
    ...overrides,
  };
}

function makeSelection(overrides: Partial<Selection> = {}): Selection {
  return {
    id: "s1",
    songId: "song",
    startMs: 0,
    endMs: 1000,
    ...overrides,
  };
}

describe("computeSelectionRegions", () => {
  it("maps a within-measure range to a single interpolated rect", () => {
    const regions = computeSelectionRegions(
      [makeSelection({ startMs: 500, endMs: 1500 })],
      makeContext(),
    );

    expect(regions).toHaveLength(1);
    expect(regions[0].rects).toEqual([{ x: 25, y: 10, width: 50, height: 80 }]);
  });

  it("splits a range that spans two measures into two rects", () => {
    const regions = computeSelectionRegions(
      [makeSelection({ startMs: 1500, endMs: 2500 })],
      makeContext(),
    );

    expect(regions[0].rects).toEqual([
      { x: 75, y: 10, width: 25, height: 80 },
      { x: 100, y: 10, width: 25, height: 80 },
    ]);
  });

  it("clamps a fraction that runs past the measure bounds", () => {
    const regions = computeSelectionRegions(
      [makeSelection({ startMs: -500, endMs: 5000 })],
      makeContext(),
    );

    expect(regions[0].rects).toEqual([
      { x: 0, y: 10, width: 100, height: 80 },
      { x: 100, y: 10, width: 100, height: 80 },
    ]);
  });

  it("enforces a minimum width for a tiny range", () => {
    const regions = computeSelectionRegions(
      [makeSelection({ startMs: 500, endMs: 510 })],
      makeContext(),
    );

    expect(regions[0].rects[0].width).toBe(2);
  });

  it("drops selections that fall outside every measure", () => {
    const regions = computeSelectionRegions(
      [makeSelection({ startMs: 5000, endMs: 6000 })],
      makeContext(),
    );

    expect(regions).toEqual([]);
  });

  it("anchors the label to the top-left rect", () => {
    const regions = computeSelectionRegions(
      [makeSelection({ startMs: 500, endMs: 1500, label: "chorus" })],
      makeContext(),
    );

    expect(regions[0].label).toEqual({ x: 25, y: 4, text: "chorus" });
  });

  it("omits the label when the selection has none", () => {
    const regions = computeSelectionRegions(
      [makeSelection({ startMs: 500, endMs: 1500 })],
      makeContext(),
    );

    expect(regions[0].label).toBeUndefined();
  });

  it("normalises an inverted range so a leftward drag still renders", () => {
    const forward = computeSelectionRegions(
      [makeSelection({ startMs: 500, endMs: 1500 })],
      makeContext(),
    );
    const inverted = computeSelectionRegions(
      [makeSelection({ startMs: 1500, endMs: 500 })],
      makeContext(),
    );

    expect(inverted[0].rects).toEqual(forward[0].rects);
  });
});
