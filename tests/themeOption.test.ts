/**
 * @jest-environment jsdom
 */
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import { normalizeOptions } from "../src/utils/tabs/tabsOptionsNormalizer";
import { defineTheme } from "../src/theme/theme";
import { ThemePresets } from "../src/theme/presets";
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

describe("normalizeOptions theme resolution", () => {
  it("resolves a preset name to its theme", () => {
    expect(normalizeOptions({ theme: "dark" }).theme).toBe(ThemePresets.dark);
  });

  it("passes a defineTheme result through untouched", () => {
    const theme = defineTheme({ colors: { fg: "#111" } });

    expect(normalizeOptions({ theme }).theme).toBe(theme);
  });

  it("leaves the theme unset when absent", () => {
    expect(normalizeOptions({}).theme).toBeUndefined();
  });

  it("falls back to unset for an unknown preset name", () => {
    expect(normalizeOptions({ theme: "nope" as "dark" }).theme).toBeUndefined();
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
});
