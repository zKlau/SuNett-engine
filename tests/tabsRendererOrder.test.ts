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

function setupSvg(): SVGSVGElement {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  return document.querySelector("#tabs") as SVGSVGElement;
}

// A lowest-pitch-first (GPIF-style) 6-string tuning: strings 1..6 ascend in
// pitch, so the renderer must flip them to draw the highest string on top.
function makeAscendingTrack(): Track {
  return {
    name: "Track",
    strings: [
      [1, 40],
      [2, 45],
      [3, 50],
      [4, 55],
      [5, 59],
      [6, 64],
    ],
    measures: [
      makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 6, value: 1 }),
              makeNote({ string: 1, value: 2 }),
            ],
          }),
        ],
      ]),
    ],
  } as unknown as Track;
}

describe("TabsRenderer string order (notes)", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("draws the highest string's notes on the top line for a lowest-first tuning", () => {
    const svg = setupSvg();
    new TabsRenderer(makeSong([makeAscendingTrack()])).generateMeasures();

    const measure = svg.querySelector(".measure")!;
    // String-line y positions, top (row 0) to bottom.
    const lineYs = Array.from(measure.querySelectorAll(".string"))
      .map((line) => Number(line.getAttribute("d")!.split(" ")[2]))
      .sort((a, b) => a - b);

    const rowOfFret = (fret: string) => {
      const note = Array.from(measure.querySelectorAll("g.tab-note")).find(
        (n) => n.getAttribute("data-fret") === fret,
      )!;
      return lineYs.indexOf(Number(note.getAttribute("y")));
    };

    // string 6 is the highest pitch (64) -> top line
    expect(rowOfFret("1")).toBe(0);
    // string 1 is the lowest pitch (40) -> bottom line
    expect(rowOfFret("2")).toBe(5);
  });
});
