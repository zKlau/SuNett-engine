/**
 * @jest-environment jsdom
 */
import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../src/theme/variables";
import { renderRhythm } from "../src/utils/tabs/rhythmRenderer";
import {
  makeBeat,
  makeBeatLayout,
  makeDuration,
  makeMeasureFromVoices,
} from "./fixtures";

const SVG_NS = "http://www.w3.org/2000/svg";

function makeParent(): SVGGElement {
  return document.createElementNS(SVG_NS, "g");
}

describe("renderRhythm", () => {
  it("groups consecutive eighth notes into quarter-note beams", () => {
    const parent = makeParent();
    const measure = makeMeasureFromVoices([
      [
        makeBeat({ duration: makeDuration({ value: 8 }) }),
        makeBeat({ duration: makeDuration({ value: 8 }) }),
        makeBeat({ duration: makeDuration({ value: 8 }) }),
        makeBeat({ duration: makeDuration({ value: 8 }) }),
      ],
    ]);

    renderRhythm({
      parent,
      measure,
      beatLayouts: [0, 1, 2, 3].map((beatIndex) =>
        makeBeatLayout({
          beatIndex,
          x: 30 + beatIndex * 40,
          width: 40,
        }),
      ),
      staffTop: 50,
      staffBottom: 100,
    });

    expect(parent.querySelectorAll(".rhythm-stem")).toHaveLength(4);
    expect(parent.querySelectorAll(".rhythm-beam")).toHaveLength(2);
    expect(
      parent.querySelector(".rhythm-beam")!.getAttribute("stroke-width"),
    ).toBe(`${constants.RHYTHM_BEAM_WIDTH}`);
  });

  it("continues a beam across a short rest within the quarter group", () => {
    const parent = makeParent();
    const measure = makeMeasureFromVoices([
      [
        makeBeat({ duration: makeDuration({ value: 8 }) }),
        makeBeat({
          status: "Rest",
          duration: makeDuration({ value: 32 }),
        }),
        makeBeat({ duration: makeDuration({ value: 8 }) }),
      ],
    ]);

    renderRhythm({
      parent,
      measure,
      beatLayouts: [
        makeBeatLayout({ beatIndex: 0, x: 40 }),
        makeBeatLayout({ beatIndex: 1, x: 80 }),
        makeBeatLayout({ beatIndex: 2, x: 120 }),
      ],
      staffTop: 50,
      staffBottom: 100,
    });

    expect(parent.querySelectorAll(".rhythm-stem")).toHaveLength(2);
    expect(parent.querySelectorAll(".rhythm-rest")).toHaveLength(1);
    expect(parent.querySelectorAll(".rhythm-beam")).toHaveLength(1);
    expect(parent.querySelector(".rhythm-beam")!.getAttribute("d")).toBe(
      "M 40 142 H 120",
    );
  });

  it("groups the 21/32 rhythm around its short rest", () => {
    const parent = makeParent();
    const durations = [8, 8, 8, 32, 8, 8];
    const measure = makeMeasureFromVoices([
      durations.map((value, beatIndex) => {
        return makeBeat({
          status: beatIndex === 3 ? "Rest" : "Normal",
          duration: makeDuration({ value }),
        });
      }),
    ]);

    renderRhythm({
      parent,
      measure,
      beatLayouts: [20, 60, 100, 120, 160, 200].map((x, beatIndex) => {
        return makeBeatLayout({ beatIndex, x });
      }),
      staffTop: 50,
      staffBottom: 100,
    });

    expect(
      Array.from(parent.querySelectorAll(".rhythm-beam")).map((beam) => {
        return beam.getAttribute("d");
      }),
    ).toEqual(["M 20 142 H 60", "M 100 142 H 160"]);
    expect(parent.querySelector(".rhythm-flag")!.getAttribute("d")).toBe(
      `M 200 142 H ${200 + constants.RHYTHM_FLAG_WIDTH}`,
    );
  });

  it("adds secondary beams for sixteenth notes", () => {
    const parent = makeParent();
    const measure = makeMeasureFromVoices([
      [
        makeBeat({ duration: makeDuration({ value: 16 }) }),
        makeBeat({ duration: makeDuration({ value: 16 }) }),
      ],
    ]);

    renderRhythm({
      parent,
      measure,
      beatLayouts: [
        makeBeatLayout({ beatIndex: 0, x: 40 }),
        makeBeatLayout({ beatIndex: 1, x: 120 }),
      ],
      staffTop: 50,
      staffBottom: 100,
    });

    expect(parent.querySelectorAll(".rhythm-beam")).toHaveLength(2);
    expect(parent.querySelector(".rhythm-beam-secondary")).not.toBeNull();
  });

  it("isolates a sixteenth-note triplet with full beams and a bracket", () => {
    const parent = makeParent();
    const tripletDuration = makeDuration({
      value: 16,
      tuplet_enters: 3,
      tuplet_times: 2,
    });
    const measure = makeMeasureFromVoices([
      [
        makeBeat({ duration: tripletDuration }),
        makeBeat({ duration: tripletDuration }),
        makeBeat({ duration: tripletDuration }),
        makeBeat({ duration: makeDuration({ value: 8 }) }),
        makeBeat({ duration: makeDuration({ value: 8 }) }),
        makeBeat({ duration: makeDuration({ value: 8 }) }),
      ],
    ]);

    renderRhythm({
      parent,
      measure,
      beatLayouts: [40, 80, 120, 160, 200, 240].map((x, beatIndex) => {
        return makeBeatLayout({ beatIndex, x });
      }),
      staffTop: 50,
      staffBottom: 100,
    });

    expect(
      Array.from(parent.querySelectorAll(".rhythm-beam")).map((beam) => {
        return beam.getAttribute("d");
      }),
    ).toEqual([
      "M 40 142 H 120",
      "M 40 147 H 80",
      "M 80 147 H 120",
      "M 200 142 H 240",
    ]);
    expect(parent.querySelector(".rhythm-flag")!.getAttribute("d")).toBe(
      `M 160 142 H ${160 + constants.RHYTHM_FLAG_WIDTH}`,
    );
    expect(
      parent.querySelector(".rhythm-tuplet-bracket")!.getAttribute("d"),
    ).toContain("M 32 153 V 160");
    expect(parent.querySelector(".rhythm-tuplet-number")!.textContent).toBe(
      "3",
    );
  });

  it.each([8, 16])(
    "renders an isolated %sth-note rhythm as an L-shaped stem",
    (duration) => {
      const parent = makeParent();
      const measure = makeMeasureFromVoices([
        [makeBeat({ duration: makeDuration({ value: duration }) })],
      ]);

      renderRhythm({
        parent,
        measure,
        beatLayouts: [makeBeatLayout({ x: 50 })],
        staffTop: 50,
        staffBottom: 100,
      });

      expect(parent.querySelectorAll(".rhythm-stem")).toHaveLength(1);
      expect(parent.querySelectorAll(".rhythm-flag")).toHaveLength(1);
      expect(parent.querySelector(".rhythm-flag")!.getAttribute("d")).toBe(
        `M 50 142 H ${50 + constants.RHYTHM_FLAG_WIDTH}`,
      );
    },
  );

  it("renders a quarter rest as theme-aware SVG geometry", () => {
    const parent = makeParent();
    const measure = makeMeasureFromVoices([
      [
        makeBeat({
          status: "Rest",
          duration: makeDuration({ value: 4 }),
        }),
      ],
    ]);

    renderRhythm({
      parent,
      measure,
      beatLayouts: [makeBeatLayout()],
      staffTop: 50,
      staffBottom: 100,
    });

    const rest = parent.querySelector(".rhythm-rest");
    expect(rest).not.toBeNull();
    expect(rest!.getAttribute("data-duration")).toBe("4");
    expect(rest!.getAttribute("data-rest-kind")).toBe("quarter");
    expect(rest!.getAttribute("transform")).toBe("translate(50 75)");
    expect(rest!.getAttribute("fill")).toBe(
      themeVar(ThemeVariables.COLOR_REST),
    );
    const glyph = rest!.querySelector("path");
    expect(glyph).not.toBeNull();
    expect(glyph!.getAttribute("d")).toContain("C");
    expect(glyph!.getAttribute("transform")).toContain("scale(0.06 -0.06)");
    expect(rest!.querySelector("text")).toBeNull();
    expect(parent.querySelector(".rhythm-stem")).toBeNull();
  });

  it.each([
    [1, "whole"],
    [2, "half"],
    [4, "quarter"],
    [8, "flagged"],
    [16, "flagged"],
    [32, "flagged"],
  ])("renders a %sth rest without font-dependent text", (duration, kind) => {
    const parent = makeParent();
    const measure = makeMeasureFromVoices([
      [
        makeBeat({
          status: "Rest",
          duration: makeDuration({ value: duration }),
        }),
      ],
    ]);

    renderRhythm({
      parent,
      measure,
      beatLayouts: [makeBeatLayout()],
      staffTop: 50,
      staffBottom: 100,
    });

    const rest = parent.querySelector(".rhythm-rest")!;
    expect(rest.getAttribute("data-rest-kind")).toBe(kind);
    expect(rest.children).toHaveLength(1);
    expect(rest.querySelector("path")).not.toBeNull();
    expect(rest.querySelector("text")).toBeNull();
  });

  it("does not render rhythm marks for empty placeholder beats", () => {
    const parent = makeParent();
    const measure = makeMeasureFromVoices([
      [
        makeBeat({
          status: "Empty",
          duration: makeDuration({ value: 8 }),
        }),
      ],
    ]);

    renderRhythm({
      parent,
      measure,
      beatLayouts: [makeBeatLayout()],
      staffTop: 50,
      staffBottom: 100,
    });

    expect(parent.childElementCount).toBe(0);
  });
});
