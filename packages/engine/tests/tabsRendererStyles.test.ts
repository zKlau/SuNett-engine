/**
 * @jest-environment jsdom
 */
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
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

describe("TabsRenderer default styles", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("injects a <style> with the tab-note transform defaults", () => {
    const svg = setupSvg();
    const renderer = new TabsRenderer(makeSong([makeTrackWithNotes()]));

    renderer.generateMeasures();

    const style = svg.querySelector("style");
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain("transform-box: fill-box;");
    expect(style!.textContent).toContain("transform-origin: center;");
  });

  it("omits the <style> when notes.defaultStyles is false", () => {
    const svg = setupSvg();
    const renderer = new TabsRenderer(makeSong([makeTrackWithNotes()]));

    renderer.generateMeasures(0, { notes: { defaultStyles: false } });

    expect(svg.querySelector("style")).toBeNull();
  });
});
