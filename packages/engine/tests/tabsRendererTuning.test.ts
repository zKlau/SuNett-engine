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

const STANDARD_TUNING: [number, number][] = [
  [1, 64],
  [2, 59],
  [3, 55],
  [4, 50],
  [5, 45],
  [6, 40],
];

function makeTuningTrack(measureCount = 1): Track {
  const measures = Array.from({ length: measureCount }, () =>
    makeMeasureFromVoices([
      [makeBeat({ notes: [makeNote({ string: 2, value: 4 })] })],
    ]),
  );
  return {
    name: "Track",
    strings: STANDARD_TUNING,
    measures,
  } as unknown as Track;
}

function setupSvg(): SVGSVGElement {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  return document.querySelector("#tabs") as SVGSVGElement;
}

describe("TabsRenderer tuning labels", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("draws the tuning once next to the first measure, top line first", () => {
    const svg = setupSvg();

    const renderer = new TabsRenderer(makeSong([makeTuningTrack(4)]));

    renderer.generateMeasures();

    const labels = Array.from(svg.querySelectorAll(".tuning-label"));
    expect(labels.map((label) => label.textContent)).toEqual([
      "E",
      "B",
      "G",
      "D",
      "A",
      "E",
    ]);

    const firstMeasure = svg.querySelector(".measure");
    expect(firstMeasure!.querySelectorAll(".tuning-label")).toHaveLength(6);
  });

  it("omits the leading barline on the first measure", () => {
    const svg = setupSvg();
    const renderer = new TabsRenderer(makeSong([makeTuningTrack()]));

    renderer.generateMeasures();

    expect(svg.querySelector(".barline-start")).toBeNull();
  });

  it("draws no tuning labels when showTuning is false", () => {
    const svg = setupSvg();
    const renderer = new TabsRenderer(makeSong([makeTuningTrack()]));

    renderer.generateMeasures(0, { showTuning: false });

    expect(svg.querySelector(".tuning-label")).toBeNull();
  });

  it("keeps tuning labels aligned with the standard order for lowest-first tunings", () => {
    const svg = setupSvg();
    const track = makeTuningTrack();
    track.strings = [...STANDARD_TUNING].reverse();

    new TabsRenderer(makeSong([track])).generateMeasures();

    expect(
      Array.from(svg.querySelectorAll(".tuning-label")).map(
        (label) => label.textContent,
      ),
    ).toEqual(["E", "B", "G", "D", "A", "E"]);
  });
});
