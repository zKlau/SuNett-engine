import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
import type { MeasureContext } from "../src/types/UI/measureContext";
import { normalizeOptions } from "../src/utils/tabs/tabsOptionsNormalizer";
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import { LayoutCalculation } from "../src/utils/tabs/layoutCalculation";
import {
  makeMeasure,
  makeMeasureContext,
  makeSong,
  makeTrack,
} from "./fixtures";

// LayoutCalculation exposes only calculateLayout; the weighting and width math
// is private by design, so reach it through a typed view of the instance.
type LayoutInternals = {
  calculateMeasureWidths: (
    measures: MeasureContext[],
    baseMeasureWidth: number,
  ) => number[];
  calculateWeights: (measureContext: MeasureContext) => number;
};

function internals(layout: LayoutCalculation): LayoutInternals {
  return layout as unknown as LayoutInternals;
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
});

describe("LayoutCalculation", () => {
  const config = normalizeOptions({});

  describe("calculateWeights", () => {
    const layout = new LayoutCalculation(makeTrack(6, []), config);

    it("weights a measure by its beat count", () => {
      const context = makeMeasureContext(makeMeasure(3), 0);

      expect(internals(layout).calculateWeights(context)).toBe(3);
    });

    it("never drops below 1 for an empty measure", () => {
      const context = makeMeasureContext(makeMeasure(0), 0);

      expect(internals(layout).calculateWeights(context)).toBe(1);
    });
  });

  describe("calculateMeasureWidths", () => {
    const layout = new LayoutCalculation(makeTrack(6, []), config);

    it("gives equally weighted measures equal widths", () => {
      const measures = [
        makeMeasureContext(makeMeasure(3), 0),
        makeMeasureContext(makeMeasure(3), 1),
      ];

      const widths = internals(layout).calculateMeasureWidths(measures, 200);

      expect(widths).toHaveLength(2);
      expect(widths[0]).toBe(widths[1]);
      expect(widths[0]).toBe(200);
    });

    it("clamps widths to the configured min and max", () => {
      const measures = [
        makeMeasureContext(makeMeasure(1), 0),
        makeMeasureContext(makeMeasure(100), 1),
      ];

      const widths = internals(layout).calculateMeasureWidths(measures, 200);

      expect(widths[0]).toBe(constants.MIN_MEASURE_WIDTH);
      expect(widths[1]).toBe(constants.MAX_MEASURE_WIDTH);
    });
  });

  describe("calculateLayout", () => {
    const track = makeTrack(6, [
      makeMeasure(2),
      makeMeasure(2),
      makeMeasure(2),
    ]);
    const measures = track.measures.map((measure, index) =>
      makeMeasureContext(measure, index),
    );
    const layoutCalculation = new LayoutCalculation(track, config);

    it("reports the string count from the track tuning", () => {
      const layout = layoutCalculation.calculateLayout(1000, measures);

      expect(layout.stringCount).toBe(6);
    });

    describe("stringCount", () => {
      function stringCountFor(track: ReturnType<typeof makeTrack>) {
        const trackMeasures = track.measures.map((measure, index) =>
          makeMeasureContext(measure, index),
        );

        return new LayoutCalculation(track, config).calculateLayout(
          1000,
          trackMeasures,
        ).stringCount;
      }

      it("uses the tuning's string count for a pitched track", () => {
        const sevenString = makeTrack(7, [makeMeasure(2)], "7-string guitar");

        expect(stringCountFor(sevenString)).toBe(7);
      });

      it("falls back to the default when a pitched track has no tuning", () => {
        const untuned = makeTrack(0, [makeMeasure(2)], "No tuning");

        expect(stringCountFor(untuned)).toBe(constants.DEFAULT_STRING_COUNT);
      });

      it("renders a fixed percussion staff regardless of tuning length", () => {
        // Drum tracks come back from the parser with a 6-string fallback tuning,
        // so the percussion_track flag — not strings.length — must drive the count.
        const drums = makeTrack(6, [makeMeasure(2)], "Drums", true);

        expect(stringCountFor(drums)).toBe(constants.PERCUSSION_LINE_COUNT);
        expect(drums.strings).toHaveLength(6);
      });
    });

    it("produces one layout per measure", () => {
      const layout = layoutCalculation.calculateLayout(1000, measures);

      expect(layout.measureLayouts).toHaveLength(measures.length);
      layout.measureLayouts.forEach((measureLayout) => {
        expect(measureLayout.width).toBeGreaterThan(0);
      });
    });

    it("keeps string spacing within its configured bounds", () => {
      const layout = layoutCalculation.calculateLayout(1000, measures);

      expect(layout.stringSpacing).toBeGreaterThanOrEqual(
        constants.MIN_STRING_SPACING,
      );
      expect(layout.stringSpacing).toBeLessThanOrEqual(
        constants.MAX_STRING_SPACING,
      );
    });

    it("derives measure height from spacing and measure padding", () => {
      const layout = layoutCalculation.calculateLayout(1000, measures);

      const expectedHeight =
        constants.MEASURE_TOP_PADDING +
        layout.stringSpacing * (layout.stringCount - 1) +
        constants.MEASURE_BOTTOM_PADDING;

      expect(layout.measureHeight).toBeCloseTo(expectedHeight);
    });

    it("wraps measures onto multiple rows when the width is small", () => {
      const layout = layoutCalculation.calculateLayout(
        constants.MIN_MEASURE_WIDTH + config.paddingX * 2,
        measures,
      );

      expect(layout.rowCount).toBeGreaterThan(1);
    });

    it("reserves a left gutter for tuning labels by default", () => {
      const layout = layoutCalculation.calculateLayout(1000, measures);

      expect(layout.tuningGutter).toBe(constants.TUNING_GUTTER);
      expect(layout.measureLayouts[0].x).toBe(
        config.paddingX + constants.TUNING_GUTTER,
      );
    });

    it("drops the gutter when showTuning is false", () => {
      const noTuningConfig = normalizeOptions({ showTuning: false });
      const noTuningLayout = new LayoutCalculation(
        track,
        noTuningConfig,
      ).calculateLayout(1000, measures);

      expect(noTuningLayout.tuningGutter).toBe(0);
      expect(noTuningLayout.measureLayouts[0].x).toBe(noTuningConfig.paddingX);
    });

    it("reserves no gutter for a percussion track (no tuning to show)", () => {
      const percussionTrack = {
        ...makeTrack(0, track.measures),
        percussion_track: true,
      } as unknown as typeof track;
      const percussionLayout = new LayoutCalculation(
        percussionTrack,
        config,
      ).calculateLayout(1000, measures);

      expect(percussionLayout.tuningGutter).toBe(0);
      expect(percussionLayout.measureLayouts[0].x).toBe(config.paddingX);
    });
  });
});
