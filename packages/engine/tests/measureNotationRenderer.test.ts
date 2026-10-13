/**
 * @jest-environment jsdom
 */
import type { MeasureHeader } from "../src/types/measure";
import type { MeasureContext } from "../src/types/UI/measureContext";
import { renderMeasureNotation } from "../src/utils/tabs/measureNotationRenderer";
import {
  makeBeat,
  makeBeatLayout,
  makeBounds,
  makeDuration,
  makeMeasureFromVoices,
  makeNote,
} from "./fixtures";

const SVG_NS = "http://www.w3.org/2000/svg";

function makeParent(): SVGGElement {
  return document.createElementNS(SVG_NS, "g");
}

describe("renderMeasureNotation", () => {
  it("renders time signatures, beat text, and lyric syllables", () => {
    const parent = makeParent();
    const measure = {
      ...makeMeasureFromVoices([
        [
          makeBeat({
            text: "Play with downstrokes",
            notes: [makeNote()],
          }),
        ],
      ]),
      time_signature: {
        numerator: 21,
        denominator: makeDuration({ value: 32 }),
        beams: [],
      },
    };
    const header = {
      time_signature: measure.time_signature,
      free_time: false,
    } as MeasureHeader;
    const measureContext: MeasureContext = {
      measure,
      header,
      index: 0,
    };

    renderMeasureNotation({
      parent,
      measureContext,
      beatLayouts: [makeBeatLayout({ x: 80 })],
      bounds: makeBounds(),
      stringCount: 6,
      showTimeSignature: true,
      lyrics: [{ beatIndex: 0, lineIndex: 0, text: "Veins" }],
    });

    const signature = parent.querySelector(".time-signature");
    expect(signature).not.toBeNull();
    expect(signature!.getAttribute("data-numerator")).toBe("21");
    expect(signature!.getAttribute("data-denominator")).toBe("32");
    expect(signature!.querySelectorAll("text")).toHaveLength(2);
    expect(parent.querySelector(".beat-text")!.textContent).toBe(
      "Play with downstrokes",
    );
    expect(parent.querySelector(".lyric")!.textContent).toBe("Veins");
  });

  it("renders repeated beat annotations once without overlapping text", () => {
    const parent = makeParent();
    const bounds = makeBounds({ x: 25 });
    const measure = makeMeasureFromVoices([
      [
        makeBeat({ text: "Play rhythm parts" }),
        makeBeat({ text: "with all downstrokes" }),
      ],
      [makeBeat({ text: "Play rhythm parts" })],
    ]);

    renderMeasureNotation({
      parent,
      measureContext: { measure, index: 0 },
      beatLayouts: [
        makeBeatLayout({ voiceIndex: 0, beatIndex: 0 }),
        makeBeatLayout({ voiceIndex: 0, beatIndex: 1 }),
        makeBeatLayout({ voiceIndex: 1, beatIndex: 0 }),
      ],
      bounds,
      stringCount: 6,
      showTimeSignature: false,
      lyrics: [],
    });

    const annotations = parent.querySelectorAll(".beat-text");
    expect(annotations).toHaveLength(1);
    expect(annotations[0].getAttribute("x")).toBe(`${bounds.x}`);
    expect(annotations[0].textContent).toBe(
      "Play rhythm parts with all downstrokes",
    );
  });

  it("wraps beat text too wide for its row onto multiple lines", () => {
    const parent = makeParent();
    const bounds = makeBounds({ x: 0, width: 120 });
    const value =
      "Play rhythm parts with all downstrokes except when indicated";
    const measure = makeMeasureFromVoices([[makeBeat({ text: value })]]);

    renderMeasureNotation({
      parent,
      measureContext: { measure, index: 0 },
      beatLayouts: [makeBeatLayout()],
      bounds,
      stringCount: 6,
      showTimeSignature: false,
      lyrics: [],
    });

    const beatText = parent.querySelector(".beat-text")!;
    const tspans = beatText.querySelectorAll("tspan");
    expect(tspans.length).toBeGreaterThan(1);
    tspans.forEach((tspan) => {
      expect(tspan.getAttribute("x")).toBe(`${bounds.x}`);
    });
    expect(beatText.textContent).toBe(value);
  });

  it("wraps into more lines as the label font size grows", () => {
    const bounds = makeBounds({ x: 0, width: 200 });
    const value =
      "Play rhythm parts with all downstrokes except when indicated";
    const measure = makeMeasureFromVoices([[makeBeat({ text: value })]]);

    const lineCountFor = (labelFontSize: number): number => {
      const parent = makeParent();
      renderMeasureNotation({
        parent,
        measureContext: { measure, index: 0 },
        beatLayouts: [makeBeatLayout()],
        bounds,
        stringCount: 6,
        showTimeSignature: false,
        lyrics: [],
        labelFontSize,
      });
      return parent.querySelectorAll(".beat-text tspan").length;
    };

    expect(lineCountFor(22)).toBeGreaterThan(lineCountFor(8));
  });
});
