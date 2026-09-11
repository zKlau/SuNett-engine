import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
import { buildNoteStyles } from "../src/utils/tabs/notesStyles";

describe("buildNoteStyles", () => {
  it("scopes the rule to the given class prefix", () => {
    expect(buildNoteStyles("tab-note")).toMatch(/^\.tab-note\s*\{/);
    expect(buildNoteStyles("note")).toMatch(/^\.note\s*\{/);
  });

  it("sets transform-box and transform-origin from the constants", () => {
    const css = buildNoteStyles(constants.NOTE_CLASS_PREFIX);

    expect(css).toContain(`transform-box: ${constants.NOTE_TRANSFORM_BOX};`);
    expect(css).toContain(
      `transform-origin: ${constants.NOTE_TRANSFORM_ORIGIN};`,
    );
  });

  it("uses fill-box and center as the shipped defaults", () => {
    expect(constants.NOTE_TRANSFORM_BOX).toBe("fill-box");
    expect(constants.NOTE_TRANSFORM_ORIGIN).toBe("center");
  });
});
