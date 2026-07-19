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

  it("defaults invertStrings to the constant and respects an explicit value", () => {
    expect(normalizeOptions({}).invertStrings).toBe(constants.INVERT_STRINGS);
    expect(normalizeOptions({ invertStrings: true }).invertStrings).toBe(true);
    expect(normalizeOptions({ invertStrings: false }).invertStrings).toBe(
      false,
    );
  });

  it("defaults showTuning to the constant and respects an explicit value", () => {
    expect(normalizeOptions({}).showTuning).toBe(constants.SHOW_TUNING);
    expect(normalizeOptions({ showTuning: false }).showTuning).toBe(false);
    expect(normalizeOptions({ showTuning: true }).showTuning).toBe(true);
  });

  describe("notes", () => {
    it("falls back to constants when notes are omitted", () => {
      const { notes } = normalizeOptions({});

      expect(notes.paddingX).toBe(constants.NOTE_PADDING_X);
      expect(notes.classPrefix).toBe(constants.NOTE_CLASS_PREFIX);
      expect(notes.background).toBe(true);
    });

    it("leaves sizes unset so they can be derived from the layout", () => {
      const { notes } = normalizeOptions({});

      expect(notes.fontSize).toBeUndefined();
      expect(notes.backgroundHeight).toBeUndefined();
    });

    it("falls back to constants when notes are an empty object", () => {
      const { notes } = normalizeOptions({ notes: {} });

      expect(notes.fontSize).toBeUndefined();
      expect(notes.background).toBe(true);
    });

    it("respects an explicit background: false (does not coerce via ||)", () => {
      const { notes } = normalizeOptions({ notes: { background: false } });

      expect(notes.background).toBe(false);
    });

    it("defaults defaultStyles to true and respects an explicit false", () => {
      expect(normalizeOptions({}).notes.defaultStyles).toBe(true);
      expect(
        normalizeOptions({ notes: { defaultStyles: false } }).notes
          .defaultStyles,
      ).toBe(false);
    });

    it("overrides size, padding and prefix when provided", () => {
      const { notes } = normalizeOptions({
        notes: { fontSize: 14, paddingX: 6, classPrefix: "note" },
      });

      expect(notes.fontSize).toBe(14);
      expect(notes.paddingX).toBe(6);
      expect(notes.classPrefix).toBe("note");
    });

    it("passes callbacks through unchanged", () => {
      const render = () => null;
      const onCreate = () => undefined;
      const onClick = () => undefined;
      const onPointerEnter = () => undefined;
      const onPointerLeave = () => undefined;

      const { notes } = normalizeOptions({
        notes: { render, onCreate, onClick, onPointerEnter, onPointerLeave },
      });

      expect(notes.render).toBe(render);
      expect(notes.onCreate).toBe(onCreate);
      expect(notes.onClick).toBe(onClick);
      expect(notes.onPointerEnter).toBe(onPointerEnter);
      expect(notes.onPointerLeave).toBe(onPointerLeave);
    });
  });
});
