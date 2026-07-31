/**
 * @jest-environment jsdom
 */
import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../src/theme/variables";
import type { MeasureHeader } from "../src/types/measure";
import type { MeasureContext } from "../src/types/UI/measureContext";
import { buildLyricsByMeasure } from "../src/utils/tabs/lyricsLayout";
import { renderMeasureNotation } from "../src/utils/tabs/measureNotationRenderer";
import { renderRhythm } from "../src/utils/tabs/rhythmRenderer";
import {
  makeBeat,
  makeBeatLayout,
  makeBounds,
  makeDuration,
  makeMeasureFromVoices,
  makeNote,
  makeSong,
  makeTrack,
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

  it("renders rest glyphs with duration metadata", () => {
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
    expect(rest!.textContent).toBe("\u{1d13d}");
    expect(rest!.getAttribute("y")).toBe("75");
    expect(rest!.getAttribute("fill")).toBe(
      themeVar(ThemeVariables.COLOR_REST),
    );
    expect(parent.querySelector(".rhythm-stem")).toBeNull();
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

describe("buildLyricsByMeasure", () => {
  it("distributes lyric syllables across playable beats and measures", () => {
    const track = makeTrack(6, [
      makeMeasureFromVoices([
        [
          makeBeat({ notes: [makeNote()] }),
          makeBeat({ status: "Rest" }),
          makeBeat({ notes: [makeNote()] }),
        ],
      ]),
      makeMeasureFromVoices([
        [makeBeat({ notes: [makeNote()] }), makeBeat({ notes: [makeNote()] })],
      ]),
    ]);
    const song = {
      ...makeSong([track]),
      lyrics: {
        track_choice: 0,
        lines: [[0, 1, "Veins that pump fear"]],
      },
    };

    const lyrics = buildLyricsByMeasure(song, track, 0);

    expect(lyrics.get(0)).toEqual([
      { beatIndex: 0, lineIndex: 0, text: "Veins" },
      { beatIndex: 2, lineIndex: 0, text: "that" },
    ]);
    expect(lyrics.get(1)).toEqual([
      { beatIndex: 0, lineIndex: 0, text: "pump" },
      { beatIndex: 1, lineIndex: 0, text: "fear" },
    ]);
  });
});
