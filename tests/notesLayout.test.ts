import { calculateBeatLayouts } from "../src/utils/tabs/notesLayout";
import { makeBeat, makeDuration, makeMeasureFromVoices } from "./fixtures";

describe("calculateBeatLayouts", () => {
  it("returns an empty array when available width is not positive", () => {
    const measure = makeMeasureFromVoices([[makeBeat()]]);

    expect(calculateBeatLayouts(measure, 0, 0)).toEqual([]);
    expect(calculateBeatLayouts(measure, 10, -5)).toEqual([]);
  });

  it("returns an empty array when the measure has no beats", () => {
    const measure = makeMeasureFromVoices([[]]);

    expect(calculateBeatLayouts(measure, 0, 100)).toEqual([]);
  });

  it("centers a single beat inside the available width", () => {
    const measure = makeMeasureFromVoices([[makeBeat()]]);

    const [layout] = calculateBeatLayouts(measure, 10, 100);

    expect(layout.x).toBe(60);
    expect(layout.width).toBe(100);
    expect(layout.beatIndex).toBe(0);
    expect(layout.voiceIndex).toBe(0);
  });

  it("splits equal-duration beats evenly", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat(), makeBeat(), makeBeat(), makeBeat()],
    ]);

    const layouts = calculateBeatLayouts(measure, 0, 400);

    expect(layouts).toHaveLength(4);
    layouts.forEach((layout) => {
      expect(layout.width).toBe(100);
    });
    expect(layouts.map((l) => l.x)).toEqual([50, 150, 250, 350]);
  });

  it("weights beats by duration so a quarter takes twice an eighth", () => {
    const measure = makeMeasureFromVoices([
      [
        makeBeat({ duration: makeDuration({ value: 4 }) }),
        makeBeat({ duration: makeDuration({ value: 8 }) }),
      ],
    ]);

    const layouts = calculateBeatLayouts(measure, 0, 300);

    expect(layouts[0].width).toBeCloseTo(200);
    expect(layouts[1].width).toBeCloseTo(100);
    expect(layouts[0].x).toBeCloseTo(100);
    expect(layouts[1].x).toBeCloseTo(250);
  });

  it("applies the dotted multiplier", () => {
    const measure = makeMeasureFromVoices([
      [
        makeBeat({ duration: makeDuration({ value: 4, dotted: true }) }),
        makeBeat({ duration: makeDuration({ value: 4 }) }),
      ],
    ]);

    const layouts = calculateBeatLayouts(measure, 0, 250);

    expect(layouts[0].width).toBeCloseTo(150);
    expect(layouts[1].width).toBeCloseTo(100);
  });

  it("applies tuplet ratios", () => {
    const measure = makeMeasureFromVoices([
      [
        makeBeat({
          duration: makeDuration({
            value: 8,
            tuplet_enters: 3,
            tuplet_times: 2,
          }),
        }),
        makeBeat({
          duration: makeDuration({
            value: 8,
            tuplet_enters: 3,
            tuplet_times: 2,
          }),
        }),
        makeBeat({
          duration: makeDuration({
            value: 8,
            tuplet_enters: 3,
            tuplet_times: 2,
          }),
        }),
      ],
    ]);

    const layouts = calculateBeatLayouts(measure, 0, 300);

    expect(layouts).toHaveLength(3);
    layouts.forEach((layout) => {
      expect(layout.width).toBeCloseTo(100);
    });
  });

  it("lays out each voice across the full available width", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat(), makeBeat()],
      [makeBeat(), makeBeat(), makeBeat(), makeBeat()],
    ]);

    const layouts = calculateBeatLayouts(measure, 0, 400);

    const voice0 = layouts.filter((l) => l.voiceIndex === 0);
    const voice1 = layouts.filter((l) => l.voiceIndex === 1);

    expect(voice0.map((l) => l.width)).toEqual([200, 200]);
    expect(voice1.map((l) => l.width)).toEqual([100, 100, 100, 100]);
    expect(voice0[0].x).toBe(100);
    expect(voice1[0].x).toBe(50);
  });

  it("tags each layout with its beat and voice index", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat(), makeBeat()],
      [makeBeat()],
    ]);

    const layouts = calculateBeatLayouts(measure, 0, 100);

    expect(layouts).toEqual([
      expect.objectContaining({ beatIndex: 0, voiceIndex: 0 }),
      expect.objectContaining({ beatIndex: 1, voiceIndex: 0 }),
      expect.objectContaining({ beatIndex: 0, voiceIndex: 1 }),
    ]);
  });
});
