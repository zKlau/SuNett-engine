import { buildBeatAnchors, firstBeatX } from "../src/playback/beatAnchors";
import {
  makeBeat,
  makeBeatLayout,
  makeDuration,
  makeMeasureFromVoices,
} from "./fixtures";

const timing = {
  index: 0,
  startMs: 1000,
  endMs: 3000,
  durationMs: 2000,
  beatCount: 4,
  beatDurationMs: 500,
};
const layout = { x: 100, y: 0, width: 400, row: 0 };

function quarters(count: number) {
  return Array.from({ length: count }, () => makeBeat());
}

describe("buildBeatAnchors", () => {
  it("pins each beat start to where its notes are drawn", () => {
    const measure = makeMeasureFromVoices([quarters(4)]);
    const beatLayouts = [140, 230, 320, 410].map((x, beatIndex) =>
      makeBeatLayout({ beatIndex, voiceIndex: 0, x }),
    );

    expect(buildBeatAnchors({ measure, timing, layout, beatLayouts })).toEqual([
      { ms: 1000, x: 140 },
      { ms: 1500, x: 230 },
      { ms: 2000, x: 320 },
      { ms: 2500, x: 410 },
      { ms: 3000, x: 500 },
    ]);
  });

  it("ends at the next measure's first beat on the same row", () => {
    const measure = makeMeasureFromVoices([quarters(1)]);
    const beatLayouts = [
      makeBeatLayout({ beatIndex: 0, voiceIndex: 0, x: 200 }),
    ];

    const anchors = buildBeatAnchors({
      measure,
      timing,
      layout,
      beatLayouts,
      nextStartX: 540,
    });

    expect(anchors[anchors.length - 1]).toEqual({ ms: 3000, x: 540 });
  });

  it("follows beat durations, not equal spacing", () => {
    const measure = makeMeasureFromVoices([
      [
        makeBeat({ duration: makeDuration({ value: 2 }) }),
        makeBeat(),
        makeBeat(),
      ],
    ]);
    const beatLayouts = [150, 300, 400].map((x, beatIndex) =>
      makeBeatLayout({ beatIndex, voiceIndex: 0, x }),
    );

    expect(
      buildBeatAnchors({ measure, timing, layout, beatLayouts }).map(
        (anchor) => anchor.ms,
      ),
    ).toEqual([1000, 2000, 2500, 3000]);
  });

  it("merges voices into one forward-moving path", () => {
    const measure = makeMeasureFromVoices([
      [
        makeBeat({ duration: makeDuration({ value: 2 }) }),
        makeBeat({ duration: makeDuration({ value: 2 }) }),
      ],
      quarters(4),
    ]);
    const beatLayouts = [
      makeBeatLayout({ beatIndex: 0, voiceIndex: 0, x: 150 }),
      makeBeatLayout({ beatIndex: 1, voiceIndex: 0, x: 350 }),
      makeBeatLayout({ beatIndex: 0, voiceIndex: 1, x: 140 }),
      makeBeatLayout({ beatIndex: 1, voiceIndex: 1, x: 240 }),
      makeBeatLayout({ beatIndex: 2, voiceIndex: 1, x: 330 }),
      makeBeatLayout({ beatIndex: 3, voiceIndex: 1, x: 420 }),
    ];

    expect(buildBeatAnchors({ measure, timing, layout, beatLayouts })).toEqual([
      { ms: 1000, x: 140 },
      { ms: 1500, x: 240 },
      { ms: 2000, x: 330 },
      { ms: 2500, x: 420 },
      { ms: 3000, x: 500 },
    ]);
  });

  it("spreads time evenly when no beats are drawn", () => {
    const measure = makeMeasureFromVoices([quarters(4)]);

    expect(
      buildBeatAnchors({ measure, timing, layout, beatLayouts: [] }),
    ).toEqual([
      { ms: 1000, x: 100 },
      { ms: 3000, x: 500 },
    ]);
  });
});

describe("firstBeatX", () => {
  it("returns the x of the earliest beat", () => {
    const measure = makeMeasureFromVoices([quarters(2)]);
    const beatLayouts = [
      makeBeatLayout({ beatIndex: 1, voiceIndex: 0, x: 300 }),
      makeBeatLayout({ beatIndex: 0, voiceIndex: 0, x: 180 }),
    ];

    expect(firstBeatX(measure, timing, beatLayouts)).toBe(180);
  });

  it("returns undefined without beats", () => {
    expect(
      firstBeatX(makeMeasureFromVoices([quarters(2)]), timing, []),
    ).toBeUndefined();
  });
});
