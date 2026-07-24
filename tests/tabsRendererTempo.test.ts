/**
 * @jest-environment jsdom
 */
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import {
  makeBeat,
  makeMeasureFromVoices,
  makeSong,
  makeTrack,
} from "./fixtures";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function setupSvg(): SVGSVGElement {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  return document.querySelector("#tabs") as SVGSVGElement;
}

function makeTempoTrack(measureCount = 1) {
  return makeTrack(
    6,
    Array.from({ length: measureCount }, () =>
      makeMeasureFromVoices([[makeBeat()]]),
    ),
  );
}

describe("TabsRenderer tempo", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("draws the song tempo once beside the first measure index", () => {
    const svg = setupSvg();
    const song = makeSong([makeTempoTrack(2)]);
    song.tempo = 120;
    song.hide_tempo = false;

    new TabsRenderer(song).generateMeasures();

    const tempos = Array.from(svg.querySelectorAll(".tempo"));
    expect(tempos).toHaveLength(1);
    expect(tempos[0].textContent).toBe("120 BPM");
    expect(tempos[0].closest(".measure")?.getAttribute("measure-index")).toBe(
      "0",
    );
  });

  it("does not draw the tempo when the song hides it", () => {
    const svg = setupSvg();
    const song = makeSong([makeTempoTrack()]);
    song.tempo = 120;
    song.hide_tempo = true;

    new TabsRenderer(song).generateMeasures();

    expect(svg.querySelector(".tempo")).toBeNull();
  });

  it("does not draw an absent tempo from a partial song fixture", () => {
    const svg = setupSvg();
    const song = makeSong([makeTempoTrack()]);

    new TabsRenderer(song).generateMeasures();

    expect(svg.querySelector(".tempo")).toBeNull();
  });
});
