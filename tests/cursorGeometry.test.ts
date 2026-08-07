import { cursorGeometryAt } from "../src/playback/cursorGeometry";
import type { SelectionLayoutContext } from "../src/selection/selectionRegions";

function makeContext(): SelectionLayoutContext {
  return {
    timeline: {
      durationMs: 2000,
      measures: [
        {
          index: 0,
          startMs: 0,
          endMs: 1000,
          durationMs: 1000,
          beatCount: 4,
          beatDurationMs: 250,
        },
        {
          index: 1,
          startMs: 1000,
          endMs: 2000,
          durationMs: 1000,
          beatCount: 4,
          beatDurationMs: 250,
        },
      ],
    },
    measures: [
      { index: 0, layout: { x: 0, y: 0, width: 100, row: 0 } },
      { index: 1, layout: { x: 100, y: 0, width: 100, row: 0 } },
    ],
    measureHeight: 200,
    topPadding: 50,
    bottomPadding: 30,
    labelOffset: 6,
    minWidth: 2,
  };
}

describe("cursorGeometryAt", () => {
  it("places the cursor partway through the containing measure", () => {
    expect(cursorGeometryAt(500, makeContext())).toEqual({
      x: 50,
      y: 50,
      height: 120,
    });
  });

  it("resolves a time in a later measure", () => {
    expect(cursorGeometryAt(1500, makeContext())?.x).toBe(150);
  });

  it("pins the cursor to the last measure's end past the song", () => {
    expect(cursorGeometryAt(9000, makeContext())?.x).toBe(200);
  });

  it("places the cursor at the very start", () => {
    expect(cursorGeometryAt(0, makeContext())?.x).toBe(0);
  });

  it("returns undefined when nothing is laid out", () => {
    const context = makeContext();
    context.measures = [];

    expect(cursorGeometryAt(500, context)).toBeUndefined();
  });
});
