/**
 * @jest-environment jsdom
 */
import { renderMeasureNotes } from "../src/utils/tabs/notesRenderer";
import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
import {
  makeBeat,
  makeBeatLayout,
  makeBounds,
  makeMeasureFromVoices,
  makeNote,
  makeNoteConfig,
  makeNoteMetrics,
} from "./fixtures";

const SVG_NS = "http://www.w3.org/2000/svg";

function makeParent(): SVGGElement {
  return document.createElementNS(SVG_NS, "g");
}

describe("slide effects", () => {
  it("renders every supported slide direction and ignores None", () => {
    const source = makeNote({
      value: 3,
      effect: {
        ...makeNote().effect,
        slides: [
          "IntoFromAbove",
          "IntoFromBelow",
          "ShiftSlideTo",
          "LegatoSlideTo",
          "OutDownwards",
          "OutUpWards",
          "None",
        ],
      },
    });
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({ notes: [source] }),
          makeBeat({ notes: [makeNote({ value: 8 })] }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [
        makeBeatLayout({ beatIndex: 0, x: 50 }),
        makeBeatLayout({ beatIndex: 1, x: 150 }),
      ],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const slides = parent.querySelectorAll(".tab-note-effect--slide");
    expect(slides).toHaveLength(6);
    expect(
      Array.from(slides).map((slide) => slide.getAttribute("data-slide-type")),
    ).toEqual([
      "IntoFromAbove",
      "IntoFromBelow",
      "ShiftSlideTo",
      "LegatoSlideTo",
      "OutDownwards",
      "OutUpWards",
    ]);
    slides.forEach((slide) => {
      expect(slide.querySelector("path")!.getAttribute("d")).toMatch(/^M /);
    });
  });

  it("renders one legato slur above a sliding chord pair", () => {
    const legatoEffect = {
      ...makeNote().effect,
      slides: ["LegatoSlideTo"] as const,
    };
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 1, value: 5, effect: legatoEffect }),
              makeNote({ string: 2, value: 3, effect: legatoEffect }),
            ],
          }),
          makeBeat({
            notes: [
              makeNote({ string: 1, value: 4 }),
              makeNote({ string: 2, value: 2 }),
            ],
          }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [
        makeBeatLayout({ beatIndex: 0, x: 50 }),
        makeBeatLayout({ beatIndex: 1, x: 150 }),
      ],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const slideLines = parent.querySelectorAll(".tab-note-effect--slide");
    const slurs = parent.querySelectorAll(
      ".tab-note-effect--legato-slide path",
    );
    expect(slideLines).toHaveLength(2);
    expect(slurs).toHaveLength(1);
    const path = slurs[0].getAttribute("d")!.split(" ");
    const backgrounds = parent.querySelectorAll<SVGRectElement>(".tab-note-bg");
    expect(path).toContain("Q");
    expect(Number(path[1])).toBe(50);
    expect(Number(path[6])).toBe(150);
    expect(Number(path[2])).toBe(
      Number(backgrounds[0].getAttribute("y")) - constants.NOTE_EFFECT_NOTE_GAP,
    );
    expect(Number(path[7])).toBe(
      Number(backgrounds[2].getAttribute("y")) - constants.NOTE_EFFECT_NOTE_GAP,
    );
    expect(slurs[0].parentElement!.getAttribute("data-target-beat")).toBe("1");
  });

  it("does not add a legato slur to an ordinary shift slide", () => {
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({
                effect: {
                  ...makeNote().effect,
                  slides: ["ShiftSlideTo"],
                },
              }),
            ],
          }),
          makeBeat({ notes: [makeNote({ value: 4 })] }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [
        makeBeatLayout({ beatIndex: 0, x: 50 }),
        makeBeatLayout({ beatIndex: 1, x: 150 }),
      ],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    expect(parent.querySelector(".tab-note-effect--slide")).not.toBeNull();
    expect(parent.querySelector(".tab-note-effect--legato-slide")).toBeNull();
  });
});
