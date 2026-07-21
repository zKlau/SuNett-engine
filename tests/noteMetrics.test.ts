import { resolveNoteMetrics } from "../src/utils/tabs/noteMetrics";
import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";

describe("resolveNoteMetrics", () => {
  it("scales the font size with the string spacing", () => {
    const tight = resolveNoteMetrics({}, 12);
    const roomy = resolveNoteMetrics({}, 20);

    expect(roomy.fontSize).toBeGreaterThan(tight.fontSize);
  });

  it("keeps the historical size at the default string spacing", () => {
    expect(resolveNoteMetrics({}, constants.STRING_SPACING).fontSize).toBe(10);
  });

  it("clamps the derived font size at both ends", () => {
    expect(resolveNoteMetrics({}, 1).fontSize).toBe(
      constants.MIN_NOTE_FONT_SIZE,
    );
    expect(resolveNoteMetrics({}, 1000).fontSize).toBe(
      constants.MAX_NOTE_FONT_SIZE,
    );
  });

  it("lets maxFontSize lift the upper clamp on the derived size", () => {
    expect(resolveNoteMetrics({ maxFontSize: 30 }, 1000).fontSize).toBe(30);
  });

  it("derives the background height from the resolved font size", () => {
    const metrics = resolveNoteMetrics({}, constants.STRING_SPACING);

    expect(metrics.backgroundHeight).toBeCloseTo(
      metrics.fontSize * constants.NOTE_BACKGROUND_RATIO,
    );
  });

  it("keeps the background in step with an explicit font size", () => {
    const metrics = resolveNoteMetrics({ fontSize: 20 }, 16);

    expect(metrics.backgroundHeight).toBeCloseTo(
      20 * constants.NOTE_BACKGROUND_RATIO,
    );
  });

  it("lets an explicit font size win and ignore the spacing", () => {
    expect(resolveNoteMetrics({ fontSize: 14 }, 9).fontSize).toBe(14);
    expect(resolveNoteMetrics({ fontSize: 14 }, 24).fontSize).toBe(14);
  });

  it("lets an explicit background height win", () => {
    expect(
      resolveNoteMetrics({ backgroundHeight: 30 }, 16).backgroundHeight,
    ).toBe(30);
  });
});
