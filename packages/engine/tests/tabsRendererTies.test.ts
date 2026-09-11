/**
 * @jest-environment jsdom
 */
import { BravuraNotationGlyphs } from "../src/constants/notationGlyphPaths";
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
              makeNote({ string: 1, value: 11, kind: "Tie" }),
              makeNote({ string: 2, value: 9, kind: "Tie" }),
            ],
          }),
        ],
      ]),
    ],
  } as unknown as Track;
}

function makeBendContinuationTrack(): Track {
  const bendEffect = {
    ...makeNote().effect,
    bend: {
      kind: "Bend" as const,
      value: 100,
      semitone_length: 1,
      max_position: 12,
      max_value: 12,
      points: [
        { position: 0, value: 0, vibrato: false },
        { position: 3, value: 4, vibrato: false },
        { position: 12, value: 4, vibrato: false },
      ],
    },
  };

  return {
    name: "Track",
    strings: Array.from({ length: 6 }, (_, index) => [index, 0]),
    measures: [
      makeMeasureFromVoices([
        [makeBeat({ notes: [makeNote({ value: 3, effect: bendEffect })] })],
      ]),
      makeMeasureFromVoices([
        [makeBeat({ notes: [makeNote({ value: 4, kind: "Tie" })] })],
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

    expect(measures[0].querySelectorAll(".tab-note-effect--tie")).toHaveLength(
      0,
    );
    expect(ties).toHaveLength(2);
    ties.forEach((tie, index) => {
      const source = sourceBackgrounds[index];
      const values = tie.getAttribute("d")!.split(" ");
      const expectedStart =
        Number(source.getAttribute("x")) +
        Number(source.getAttribute("width")) / 2;

      expect(Number(values[1])).toBeCloseTo(expectedStart);
      expect(Number(values[5])).toBeGreaterThan(Number(values[2]));
      expect(Number(values[5])).toBeGreaterThan(Number(values[7]));
      expect(tie.parentElement?.getAttribute("data-placement")).toBe("below");
    });
  });

  it("splits tied notes across wrapped rows", () => {
    const svg = setupSvg();
    new TabsRenderer(makeSong([makeTiedTrack()])).generateMeasures(0, {
      measuresPerRow: 1,
    });

    const measures = svg.querySelectorAll(".measure");
    const sourceBackgrounds =
      measures[0].querySelectorAll<SVGRectElement>(".tab-note-bg");
    const destinationBackgrounds =
      measures[1].querySelectorAll<SVGRectElement>(".tab-note-bg");
    const sourceString = measures[0].querySelector(".string")!;
    const destinationString = measures[1].querySelector(".string")!;
    const measureEnd = Number(sourceString.getAttribute("d")!.split(" ")[4]);
    const measureStart = Number(
      destinationString.getAttribute("d")!.split(" ")[1],
    );
    const outgoing = measures[0].querySelectorAll(".tab-note-effect--tie path");
    const incoming = measures[1].querySelectorAll(".tab-note-effect--tie path");

    expect(outgoing).toHaveLength(2);
    expect(incoming).toHaveLength(2);
    outgoing.forEach((path, index) => {
      const values = path.getAttribute("d")!.split(" ");
      const source = sourceBackgrounds[index];

      expect(Number(values[1])).toBeCloseTo(
        Number(source.getAttribute("x")) +
          Number(source.getAttribute("width")) / 2,
      );
      expect(Number(values[6])).toBeCloseTo(measureEnd);
      expect(Number(values[7])).toBeCloseTo(Number(values[2]));
      expect(Number(values[5])).toBeGreaterThan(Number(values[2]));
      expect(path.parentElement?.getAttribute("data-placement")).toBe("below");
    });
    incoming.forEach((path, index) => {
      const values = path.getAttribute("d")!.split(" ");
      const destination = destinationBackgrounds[index];

      expect(Number(values[1])).toBeCloseTo(measureStart);
      expect(Number(values[6])).toBeCloseTo(
        Number(destination.getAttribute("x")) +
          Number(destination.getAttribute("width")) / 2,
      );
      expect(Number(values[2])).toBeCloseTo(Number(values[7]));
      expect(Number(values[5])).toBeGreaterThan(Number(values[2]));
      expect(path.parentElement?.getAttribute("data-placement")).toBe("below");
    });
    expect(
      [...measures[1].querySelectorAll(".tab-note-text")].map(
        (element) => element.textContent,
      ),
    ).toEqual(["(10)", "(8)"]);
  });

  it("defers a bend to its tied continuation and inherits the source fret", () => {
    const svg = setupSvg();
    new TabsRenderer(makeSong([makeBendContinuationTrack()])).generateMeasures(
      0,
      { measuresPerRow: 2 },
    );

    const measures = svg.querySelectorAll(".measure");
    const sourceBend = measures[0].querySelector(".tab-note-effect--bend");
    const destination = measures[1].querySelector(".tab-note")!;
    const background = destination.querySelector(".tab-note-bg")!;
    const bend = measures[1].querySelector(".tab-note-effect--bend")!;
    const paths = bend.querySelectorAll("path");
    const path = paths[0].getAttribute("d")!.split(" ");

    expect(sourceBend).toBeNull();
    expect(destination.querySelector(".tab-note-text")!.textContent).toBe(
      "(3)",
    );
    expect(Number(path[1])).toBe(
      Number(background.getAttribute("x")) +
        Number(background.getAttribute("width")) +
        constants.NOTE_EFFECT_NOTE_GAP,
    );
    expect(Number(path[2])).toBe(
      Number(background.getAttribute("y")) - constants.NOTE_EFFECT_NOTE_GAP,
    );
    expect(Number(path[8])).toBeGreaterThan(Number(path[1]));
    expect(paths[1].getAttribute("d")).toBe(
      BravuraNotationGlyphs.BEND_ARROW_UP.path,
    );
    expect(bend.querySelector("text")!.textContent).toBe("full");
  });

  it("keeps a bend on its source note when the tie wraps rows", () => {
    const svg = setupSvg();
    new TabsRenderer(makeSong([makeBendContinuationTrack()])).generateMeasures(
      0,
      { measuresPerRow: 1 },
    );

    const measures = svg.querySelectorAll(".measure");

    expect(measures[0].querySelector(".tab-note-effect--bend")).not.toBeNull();
    expect(measures[1].querySelector(".tab-note-effect--bend")).toBeNull();
    expect(measures[0].querySelectorAll(".tab-note-effect--tie")).toHaveLength(
      1,
    );
    expect(measures[1].querySelectorAll(".tab-note-effect--tie")).toHaveLength(
      1,
    );
    expect(measures[1].querySelector(".tab-note-text")!.textContent).toBe(
      "(3)",
    );
  });
});
