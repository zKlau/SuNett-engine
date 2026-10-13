/**
 * @jest-environment jsdom
 */
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import { ThemeVariables, themeVar } from "../src/theme/variables";
import type { ThemeLike } from "../src/theme/resolveTheme";
import {
  makeBeat,
  makeMeasureFromVoices,
  makeNote,
  makeSong,
} from "./fixtures";
import type { Track } from "../src/types/track";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function makeTrackWithNotes(): Track {
  const measure = makeMeasureFromVoices([
    [makeBeat({ notes: [makeNote({ string: 1, value: 3 })] })],
  ]);
  return {
    name: "Track",
    strings: Array.from({ length: 6 }, (_, index) => [index, 0]),
    measures: [measure],
  } as unknown as Track;
}

function renderTab(theme?: ThemeLike): SVGSVGElement {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  const svg = document.querySelector("#tabs") as SVGSVGElement;
  new TabsRenderer(makeSong([makeTrackWithNotes()]), {
    theme,
  }).generateMeasures();
  return svg;
}

describe("themeVar", () => {
  it("wraps the variable with its documented fallback", () => {
    expect(themeVar(ThemeVariables.COLOR_FG)).toBe(
      "var(--sunett-color-fg, currentColor)",
    );
  });

  it("embeds the full var() chain for derived variables", () => {
    expect(themeVar(ThemeVariables.COLOR_STRING)).toBe(
      "var(--sunett-color-string, var(--sunett-color-fg, currentColor))",
    );
  });
});

describe("renderer theme variable defaults", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("strokes string lines through the string colour variable", () => {
    const string = renderTab().querySelector(".string");

    expect(string?.getAttribute("stroke")).toBe(
      themeVar(ThemeVariables.COLOR_STRING),
    );
    expect(string?.getAttribute("opacity")).toBe(
      themeVar(ThemeVariables.STRING_OPACITY),
    );
    expect(string?.getAttribute("fill")).toBe("none");
  });

  it("uses per-index string colors ahead of the shared string color", () => {
    const svg = renderTab({
      colors: {
        string: "#64748b",
        stringByIndex: { 0: "#ef4444", 5: "#3b82f6" },
      },
    });

    expect(
      svg.querySelector('.string[string-index="0"]')?.getAttribute("stroke"),
    ).toBe("#ef4444");
    expect(
      svg.querySelector('.string[string-index="1"]')?.getAttribute("stroke"),
    ).toBe(themeVar(ThemeVariables.COLOR_STRING));
    expect(
      svg.querySelector('.string[string-index="5"]')?.getAttribute("stroke"),
    ).toBe("#3b82f6");
  });

  it("strokes barlines through the barline colour variable", () => {
    const barline = renderTab().querySelector(".barline");

    expect(barline?.getAttribute("stroke")).toBe(
      themeVar(ThemeVariables.COLOR_BARLINE),
    );
    expect(barline?.getAttribute("opacity")).toBe(
      themeVar(ThemeVariables.BARLINE_OPACITY),
    );
  });

  it("fills labels through the muted colour and label font variables", () => {
    const label = renderTab().querySelector(".measure-index");

    expect(label?.getAttribute("fill")).toBe(
      themeVar(ThemeVariables.COLOR_MUTED),
    );
    expect(label?.getAttribute("font-family")).toBe(
      themeVar(ThemeVariables.FONT_LABEL),
    );
  });

  it("fills notes through the note colour and font variables", () => {
    const svg = renderTab();

    expect(svg.querySelector(".tab-note-bg")?.getAttribute("fill")).toBe(
      themeVar(ThemeVariables.COLOR_NOTE_BG),
    );
    expect(svg.querySelector(".tab-note-text")?.getAttribute("fill")).toBe(
      themeVar(ThemeVariables.COLOR_NOTE_FG),
    );
    expect(
      svg.querySelector(".tab-note-text")?.getAttribute("font-family"),
    ).toBe(themeVar(ThemeVariables.FONT_NOTE));
  });
});
