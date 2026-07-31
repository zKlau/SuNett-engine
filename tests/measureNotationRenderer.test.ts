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
});
