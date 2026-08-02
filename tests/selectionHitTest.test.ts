import {
  selectionAtPoint,
  timeAtPoint,
} from "../src/selection/selectionHitTest";
import type { SelectionLayoutContext } from "../src/selection/selectionRegions";
import type { Selection } from "../src/types/selection";

function makeContext(): SelectionLayoutContext {
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
  };
}

describe("timeAtPoint", () => {
  it("interpolates the time within the hit measure", () => {
    expect(timeAtPoint({ x: 50, y: 50 }, makeContext())).toBe(1000);
    expect(timeAtPoint({ x: 150, y: 50 }, makeContext())).toBe(3000);
  });

  it("clamps to the measure edges", () => {
    expect(timeAtPoint({ x: 0, y: 50 }, makeContext())).toBe(0);
    expect(timeAtPoint({ x: 200, y: 50 }, makeContext())).toBe(4000);
  });

  it("snaps to the nearest measure when x is outside every measure", () => {
    expect(timeAtPoint({ x: -20, y: 50 }, makeContext())).toBe(0);
  });

  it("returns undefined when the point is above or below the staff row", () => {
    expect(timeAtPoint({ x: 50, y: 500 }, makeContext())).toBeUndefined();
    expect(timeAtPoint({ x: 50, y: -20 }, makeContext())).toBeUndefined();
  });
});

describe("selectionAtPoint", () => {
  const selections: Selection[] = [
    { id: "a", songId: "s", startMs: 0, endMs: 1000 },
  ];

  it("returns the selection under the point", () => {
    expect(selectionAtPoint({ x: 25, y: 50 }, selections, makeContext())?.id).toBe(
      "a",
    );
  });

  it("returns undefined when no selection covers the point", () => {
    expect(
      selectionAtPoint({ x: 75, y: 50 }, selections, makeContext()),
    ).toBeUndefined();
  });

  it("returns the topmost selection when regions overlap", () => {
    const overlapping: Selection[] = [
      { id: "under", songId: "s", startMs: 0, endMs: 1500 },
      { id: "over", songId: "s", startMs: 0, endMs: 1500 },
    ];

    expect(
      selectionAtPoint({ x: 25, y: 50 }, overlapping, makeContext())?.id,
    ).toBe("over");
  });
});
