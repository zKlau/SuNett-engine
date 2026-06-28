import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
import type { MeasureContext } from "../src/types/UI/measureContext";
import type { TabLayout } from "../src/types/UI/tabLayout";
import type { Track } from "../src/types/track";
import { normalizeOptions } from "../src/utils/tabs/tabsOptionsNormalizer";
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import {
  makeMeasure,
  makeMeasureContext,
  makeSong,
  makeTrack,
} from "./fixtures";

type RendererConfig = ReturnType<typeof normalizeOptions>;

// The layout math is private by design (DOM drawing is kept separate), so reach
// it through a typed view of the instance rather than the DOM-bound public API.
type RendererInternals = {
  calculateLayout: (
    svgWidth: number,
    track: Track,
    measures: MeasureContext[],
    config: RendererConfig,
  ) => TabLayout;
  calculateMeasureWidths: (
    measures: MeasureContext[],
    baseMeasureWidth: number,
    config: RendererConfig,
  ) => number[];
  getMeasureWeight: (measureContext: MeasureContext) => number;
};

function internals(renderer: TabsRenderer): RendererInternals {
  return renderer as unknown as RendererInternals;
}

describe("TabsRenderer", () => {
  describe("public API", () => {
    it("getTracks returns the song's tracks", () => {
      const tracks = [makeTrack(6, [makeMeasure(1)])];
      const renderer = new TabsRenderer(makeSong(tracks));

      expect(renderer.getTracks()).toBe(tracks);
    });

    it("generateMeasures is a no-op without a DOM (returns undefined, does not throw)", () => {
      const renderer = new TabsRenderer(
        makeSong([makeTrack(6, [makeMeasure(1)])]),
      );

      expect(() => renderer.generateMeasures()).not.toThrow();
      expect(renderer.generateMeasures()).toBeUndefined();
    });
  });

  describe("getMeasureWeight", () => {
    const renderer = new TabsRenderer(makeSong([]));

    it("weights a measure by its beat count", () => {
      const context = makeMeasureContext(makeMeasure(3), 0);

      expect(internals(renderer).getMeasureWeight(context)).toBe(3);
    });

    it("never drops below 1 for an empty measure", () => {
      const context = makeMeasureContext(makeMeasure(0), 0);

      expect(internals(renderer).getMeasureWeight(context)).toBe(1);
    });
  });

  describe("calculateMeasureWidths", () => {
    const renderer = new TabsRenderer(makeSong([]));
    const config = normalizeOptions({});

    it("gives equally weighted measures equal widths", () => {
      const measures = [
        makeMeasureContext(makeMeasure(3), 0),
        makeMeasureContext(makeMeasure(3), 1),
      ];

      const widths = internals(renderer).calculateMeasureWidths(
        measures,
        200,
        config,
      );

      expect(widths).toHaveLength(2);
      expect(widths[0]).toBe(widths[1]);
      expect(widths[0]).toBe(200);
    });

    it("clamps widths to the configured min and max", () => {
      const measures = [
        makeMeasureContext(makeMeasure(1), 0),
        makeMeasureContext(makeMeasure(100), 1),
      ];

      const widths = internals(renderer).calculateMeasureWidths(
        measures,
        200,
        config,
      );

      expect(widths[0]).toBe(constants.MIN_MEASURE_WIDTH);
      expect(widths[1]).toBe(constants.MAX_MEASURE_WIDTH);
    });
  });

  describe("calculateLayout", () => {
    const renderer = new TabsRenderer(makeSong([]));
    const config = normalizeOptions({});
    const track = makeTrack(6, [
      makeMeasure(2),
      makeMeasure(2),
      makeMeasure(2),
    ]);
    const measures = track.measures.map((measure, index) =>
      makeMeasureContext(measure, index),
    );

    it("reports the string count from the track tuning", () => {
      const layout = internals(renderer).calculateLayout(
        1000,
        track,
        measures,
        config,
      );

      expect(layout.stringCount).toBe(6);
    });

    it("produces one layout per measure", () => {
      const layout = internals(renderer).calculateLayout(
        1000,
        track,
        measures,
        config,
      );

      expect(layout.measureLayouts).toHaveLength(measures.length);
      layout.measureLayouts.forEach((measureLayout) => {
        expect(measureLayout.width).toBeGreaterThan(0);
      });
    });

    it("keeps string spacing within its configured bounds", () => {
      const layout = internals(renderer).calculateLayout(
        1000,
        track,
        measures,
        config,
      );

      expect(layout.stringSpacing).toBeGreaterThanOrEqual(
        constants.MIN_STRING_SPACING,
      );
      expect(layout.stringSpacing).toBeLessThanOrEqual(
        constants.MAX_STRING_SPACING,
      );
    });

    it("derives measure height from spacing and note padding", () => {
      const layout = internals(renderer).calculateLayout(
        1000,
        track,
        measures,
        config,
      );

      const expectedHeight =
        constants.NOTE_TOP_PADDING +
        layout.stringSpacing * (layout.stringCount - 1) +
        constants.NOTE_BOTTOM_PADDING;

      expect(layout.measureHeight).toBeCloseTo(expectedHeight);
    });

    it("wraps measures onto multiple rows when the width is small", () => {
      const layout = internals(renderer).calculateLayout(
        constants.MIN_MEASURE_WIDTH + config.paddingX * 2,
        track,
        measures,
        config,
      );

      expect(layout.rowCount).toBeGreaterThan(1);
    });
  });
});
