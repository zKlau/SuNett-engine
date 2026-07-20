/**
 * @jest-environment jsdom
 */
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import { normalizeOptions } from "../src/utils/tabs/tabsOptionsNormalizer";
import { defineTheme } from "../src/theme/theme";
import { ThemePresets } from "../src/theme/presets";
import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
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

function setupSvg(): SVGSVGElement {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  return document.querySelector("#tabs") as SVGSVGElement;
}

describe("normalizeOptions sizing", () => {
  it("feeds theme sizing into the resolved layout options", () => {
    const config = normalizeOptions(
      {},
      {
        noteFontSize: 18,
        stringSpacing: 22,
        rowSpacing: 40,
      },
    );

    expect(config.notes.fontSize).toBe(18);
    expect(config.stringSpacing).toBe(22);
    expect(config.rowGap).toBe(40);
  });

  it("lets explicit options outrank theme sizing", () => {
    const config = normalizeOptions(
      { stringSpacing: 30, rowGap: 12, notes: { fontSize: 9 } },
      { noteFontSize: 18, stringSpacing: 22, rowSpacing: 40 },
    );

    expect(config.notes.fontSize).toBe(9);
    expect(config.stringSpacing).toBe(30);
    expect(config.rowGap).toBe(12);
  });

  it("falls back to constants when neither option nor theme sets sizing", () => {
    const config = normalizeOptions({});

    expect(config.stringSpacing).toBe(constants.STRING_SPACING);
    expect(config.rowGap).toBe(constants.ROW_GAP);
    expect(config.notes.fontSize).toBeUndefined();
  });
});

describe("TabsRenderer theme option", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("writes preset variables onto the target svg", () => {
    const svg = setupSvg();

    new TabsRenderer(makeSong([makeTrackWithNotes()])).generateMeasures(0, {
      theme: "dark",
    });

    expect(svg.style.getPropertyValue("--sunett-color-fg")).toBe("#e5e7eb");
    expect(svg.style.getPropertyValue("--sunett-color-note-bg")).toBe(
      "#16171d",
    );
  });

  it("writes custom theme variables onto the target svg", () => {
    const svg = setupSvg();

    new TabsRenderer(makeSong([makeTrackWithNotes()])).generateMeasures(0, {
      theme: defineTheme({ colors: { accent: "#c084fc" } }),
    });

    expect(svg.style.getPropertyValue("--sunett-color-accent")).toBe("#c084fc");
  });

  it("sets no variables when no theme is given", () => {
    const svg = setupSvg();

    new TabsRenderer(makeSong([makeTrackWithNotes()])).generateMeasures();

    expect(svg.getAttribute("style")).toBeNull();
  });

  it("removes the variables on cleanup", () => {
    const svg = setupSvg();
    const renderer = new TabsRenderer(makeSong([makeTrackWithNotes()]));

    renderer.generateMeasures(0, { theme: "dark" })?.();

    expect(svg.style.getPropertyValue("--sunett-color-fg")).toBe("");
  });

  it("does not leave stale variables when re-rendering with another theme", () => {
    const svg = setupSvg();
    const renderer = new TabsRenderer(makeSong([makeTrackWithNotes()]));

    renderer.generateMeasures(0, { theme: "dark" });
    renderer.generateMeasures(0, {
      theme: defineTheme({ colors: { fg: "#111" } }),
    });

    expect(svg.style.getPropertyValue("--sunett-color-fg")).toBe("#111");
    expect(svg.style.getPropertyValue("--sunett-color-note-bg")).toBe("");
  });

  it("applies a construction-time theme without a per-call theme", () => {
    const svg = setupSvg();
    const renderer = new TabsRenderer(makeSong([makeTrackWithNotes()]), {
      theme: "dark",
    });

    renderer.generateMeasures();

    expect(svg.style.getPropertyValue("--sunett-color-fg")).toBe("#e5e7eb");
    expect(renderer.getTheme()).toBe(ThemePresets.dark);
  });

  it("getTheme reflects the resolved current theme", () => {
    const theme = defineTheme({ colors: { accent: "#f0f" } });
    const renderer = new TabsRenderer(makeSong([makeTrackWithNotes()]), {
      theme,
    });

    expect(renderer.getTheme()).toBe(theme);
  });

  it("setTheme merges onto the current theme and re-renders", () => {
    const svg = setupSvg();
    const renderer = new TabsRenderer(makeSong([makeTrackWithNotes()]), {
      theme: "dark",
    });
    renderer.generateMeasures();

    const merged = renderer.setTheme({ colors: { accent: "#f472b6" } });

    expect(svg.style.getPropertyValue("--sunett-color-accent")).toBe("#f472b6");
    expect(svg.style.getPropertyValue("--sunett-color-fg")).toBe("#e5e7eb");
    expect(merged.variables["--sunett-color-fg"]).toBe("#e5e7eb");
  });

  it("setTheme changing sizing recomputes the layout", () => {
    const svg = setupSvg();
    const renderer = new TabsRenderer(makeSong([makeTrackWithNotes()]));
    renderer.generateMeasures();

    renderer.setTheme({ sizing: { stringSpacing: 40 } });

    const firstStringY = svg.querySelector(".string")?.getAttribute("d");
    const secondStringY = svg
      .querySelector('.string[string-index="1"]')
      ?.getAttribute("d");
    expect(firstStringY).not.toBe(secondStringY);
    expect(renderer.getTheme().sizing).toEqual({ stringSpacing: 40 });
  });

  it("setTheme before any render only updates the theme", () => {
    const renderer = new TabsRenderer(makeSong([makeTrackWithNotes()]));

    const theme = renderer.setTheme({ colors: { fg: "#123" } });

    expect(theme.variables["--sunett-color-fg"]).toBe("#123");
  });

  it("paints a background rect through the background variable", () => {
    const svg = setupSvg();

    new TabsRenderer(makeSong([makeTrackWithNotes()])).generateMeasures();

    const background = svg.querySelector(".tab-background");
    expect(background?.getAttribute("fill")).toBe(
      "var(--sunett-color-bg, transparent)",
    );
  });

  it("dark preset paints a dark canvas background", () => {
    const svg = setupSvg();

    new TabsRenderer(makeSong([makeTrackWithNotes()])).generateMeasures(0, {
      theme: "dark",
    });

    expect(svg.style.getPropertyValue("--sunett-color-bg")).toBe("#16171d");
  });
});
