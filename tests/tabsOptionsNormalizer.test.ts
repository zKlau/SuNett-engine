import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
import { normalizeOptions } from "../src/utils/tabs/tabsOptionsNormalizer";

describe("normalizeOptions", () => {
  it("falls back to constants when nothing is provided", () => {
    const config = normalizeOptions({});

    expect(config.trackIndex).toBe(0);
    expect(config.measuresPerRow).toBe(constants.DEFAULT_MEASURES_PER_ROW);
    expect(config.minMeasureWidth).toBe(constants.MIN_MEASURE_WIDTH);
    expect(config.defaultMeasureWidth).toBe(constants.DEFAULT_MEASURE_WIDTH);
    expect(config.maxMeasureWidth).toBe(constants.MAX_MEASURE_WIDTH);
    expect(config.stringSpacing).toBe(constants.STRING_SPACING);
    expect(config.rowGap).toBe(constants.ROW_GAP);
    expect(config.paddingX).toBe(constants.TAB_PADDING_X);
    expect(config.paddingY).toBe(constants.TAB_PADDING_Y);
  });

  it("prefers provided options over constants", () => {
    const config = normalizeOptions({
      minMeasureWidth: 50,
      rowGap: 99,
      trackIndex: 2,
    });

    expect(config.minMeasureWidth).toBe(50);
    expect(config.rowGap).toBe(99);
    expect(config.trackIndex).toBe(2);
  });

  it("treats 0 as an explicit value, not a missing one", () => {
    const config = normalizeOptions({ paddingX: 0, minStringSpacing: 0 });

    expect(config.paddingX).toBe(0);
    expect(config.minStringSpacing).toBe(0);
  });

  it("clamps measuresPerRow to at least 1", () => {
    expect(normalizeOptions({ measuresPerRow: 0 }).measuresPerRow).toBe(1);
    expect(normalizeOptions({ measuresPerRow: -5 }).measuresPerRow).toBe(1);
  });
});
