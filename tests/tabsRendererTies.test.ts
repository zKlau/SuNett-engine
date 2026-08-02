/**
 * @jest-environment jsdom
 */
import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
import type { Track } from "../src/types/track";
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import {
  makeBeat,
  makeMeasureFromVoices,
  makeNote,
  makeSong,
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

function makeTiedTrack(): Track {
  return {
    name: "Track",
    strings: Array.from({ length: 6 }, (_, index) => [index, 0]),
    measures: [
      makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 1, value: 10 }),
              makeNote({ string: 2, value: 8 }),
            ],
          }),
        ],
      ]),
      makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 1, value: 10, kind: "Tie" }),
              makeNote({ string: 2, value: 8, kind: "Tie" }),
            ],
          }),
        ],
      ]),
    ],
  } as unknown as Track;
}

describe("TabsRenderer cross-measure ties", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("connects tied chord notes across adjacent measures on one row", () => {
    const svg = setupSvg();
    new TabsRenderer(makeSong([makeTiedTrack()])).generateMeasures(0, {
      measuresPerRow: 2,
    });

    const measures = svg.querySelectorAll(".measure");
    const sourceBackgrounds =
      measures[0].querySelectorAll<SVGRectElement>(".tab-note-bg");
    const ties = measures[1].querySelectorAll(".tab-note-effect--tie path");

    expect(ties).toHaveLength(2);
    ties.forEach((tie, index) => {
      const source = sourceBackgrounds[index];
      const expectedStart =
        Number(source.getAttribute("x")) +
        Number(source.getAttribute("width")) +
        constants.NOTE_EFFECT_NOTE_GAP;
      const start = Number(tie.getAttribute("d")!.split(" ")[1]);

      expect(start).toBeCloseTo(expectedStart);
    });
  });

  it("does not draw a connection back across a wrapped row", () => {
    const svg = setupSvg();
    new TabsRenderer(makeSong([makeTiedTrack()])).generateMeasures(0, {
      measuresPerRow: 1,
    });

    const measures = svg.querySelectorAll(".measure");
    const source = measures[0].querySelector(".tab-note-bg")!;
    const sourceEdge =
      Number(source.getAttribute("x")) +
      Number(source.getAttribute("width")) +
      constants.NOTE_EFFECT_NOTE_GAP;
    const tiePath = measures[1].querySelector(
      ".tab-note-effect--tie path",
    ) as SVGPathElement;
    const start = Number(tiePath.getAttribute("d")!.split(" ")[1]);

    expect(start).not.toBeCloseTo(sourceEdge);
  });
});
