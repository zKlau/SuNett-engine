/**
 * @jest-environment jsdom
 */
import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
import { renderMeasureNotes } from "../src/utils/tabs/notesRenderer";
import {
  makeBeat,
  makeBeatLayout,
  makeBounds,
  makeDuration,
  makeMeasureFromVoices,
  makeNote,
  makeNoteConfig,
  makeNoteMetrics,
} from "./fixtures";

const SVG_NS = "http://www.w3.org/2000/svg";

function makeParent(): SVGGElement {
  return document.createElementNS(SVG_NS, "g");
}

describe("linked note effects", () => {
  it("renders hammer-on and pull-off arcs between matching-string notes", () => {
    const hammer = makeNote({
      string: 1,
      value: 5,
      effect: { ...makeNote().effect, hammer: true },
    });
    const pullOff = makeNote({
      string: 2,
      value: 8,
      effect: { ...makeNote().effect, hammer: true },
    });
    const measure = makeMeasureFromVoices([
      [
        makeBeat({ notes: [hammer, pullOff] }),
        makeBeat({
          notes: [
            makeNote({ string: 1, value: 7 }),
            makeNote({ string: 2, value: 3 }),
          ],
        }),
      ],
    ]);
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure,
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

    const effects = parent.querySelectorAll(
      '.tab-note-effect--hammer[data-effect="hammer"]',
    );
    expect(effects).toHaveLength(2);
    expect(effects[0].getAttribute("data-technique")).toBe("h");
    expect(effects[1].getAttribute("data-technique")).toBe("p");
    expect(effects[0].querySelector("text")).toBeNull();
    expect(effects[1].querySelector("text")).toBeNull();
    const hammerPath = effects[0]
      .querySelector("path")!
      .getAttribute("d")!
      .split(" ");
    expect(hammerPath).toContain("Q");
    expect(Number(hammerPath[2]) - Number(hammerPath[5])).toBe(
      constants.NOTE_EFFECT_SLUR_HEIGHT,
    );
  });

  it("renders a chained triplet hammer phrase as one outer slur", () => {
    const parent = makeParent();
    const tripletDuration = makeDuration({
      value: 16,
      tuplet_enters: 3,
      tuplet_times: 2,
    });
    const hammerEffect = { ...makeNote().effect, hammer: true };

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            duration: tripletDuration,
            notes: [makeNote({ value: 0, effect: hammerEffect })],
          }),
          makeBeat({
            duration: tripletDuration,
            notes: [makeNote({ value: 2, effect: hammerEffect })],
          }),
          makeBeat({
            duration: tripletDuration,
            notes: [makeNote({ value: 0, effect: hammerEffect })],
          }),
        ],
      ]),
      measureIndex: 203,
      beatLayouts: [50, 100, 150].map((x, beatIndex) => {
        return makeBeatLayout({ beatIndex, x });
      }),
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const effects = parent.querySelectorAll(".tab-note-effect--hammer");
    expect(effects).toHaveLength(1);
    expect(effects[0].getAttribute("data-technique")).toBe("h-p");
    expect(effects[0].getAttribute("data-target-beat")).toBe("2");
    expect(effects[0].getAttribute("data-tuplet")).toBe("3");
    const path = effects[0]
      .querySelector("path")!
      .getAttribute("d")!
      .split(" ");
    expect(Number(path[2]) - Number(path[5])).toBe(
      constants.NOTE_EFFECT_PHRASE_SLUR_HEIGHT,
    );
  });

  it("omits repeated same-measure tie labels and renders incoming arcs", () => {
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({ notes: [makeNote({ string: 1, value: 5 })] }),
          makeBeat({
            notes: [makeNote({ string: 1, value: 5, kind: "Tie" })],
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

    const texts = parent.querySelectorAll(".tab-note-text");
    expect(texts[0].textContent).toBe("5");
    expect(texts).toHaveLength(1);
    const tie = parent.querySelector(".tab-note-effect--tie");
    expect(tie).not.toBeNull();
    const tiePath = tie!.querySelector("path")!.getAttribute("d")!.split(" ");
    expect(tiePath).toContain("Q");
    expect(tie!.getAttribute("data-placement")).toBe("below");
    expect(Number(tiePath[5]) - Number(tiePath[2])).toBe(
      Math.max(
        constants.NOTE_EFFECT_SLUR_HEIGHT,
        100 * constants.NOTE_EFFECT_TIE_HEIGHT_RATIO,
      ),
    );
  });

  it("attaches every tied chord arc below its note", () => {
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 0, value: 4 }),
              makeNote({ string: 1, value: 0 }),
            ],
          }),
          makeBeat({
            notes: [
              makeNote({ string: 0, value: 4, kind: "Tie" }),
              makeNote({ string: 1, value: 0, kind: "Tie" }),
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

    const ties = parent.querySelectorAll(".tab-note-effect--tie");
    const backgrounds = parent.querySelectorAll<SVGRectElement>(".tab-note-bg");
    const upperPath = ties[0]
      .querySelector("path")!
      .getAttribute("d")!
      .split(" ");
    const lowerPath = ties[1]
      .querySelector("path")!
      .getAttribute("d")!
      .split(" ");

    expect(ties).toHaveLength(2);
    expect(ties[0].getAttribute("data-placement")).toBe("below");
    expect(ties[1].getAttribute("data-placement")).toBe("below");
    expect(Number(upperPath[5])).toBeGreaterThan(Number(upperPath[2]));
    expect(Number(lowerPath[5])).toBeGreaterThan(Number(lowerPath[2]));
    expect(Number(upperPath[1])).toBe(50);
    expect(Number(upperPath[6])).toBe(150);
    expect(Number(lowerPath[1])).toBe(50);
    expect(Number(lowerPath[6])).toBe(150);
    expect(Number(upperPath[2])).toBe(
      Number(backgrounds[0].getAttribute("y")) +
        Number(backgrounds[0].getAttribute("height")) +
        constants.NOTE_EFFECT_NOTE_GAP,
    );
    expect(Number(upperPath[7])).toBe(
      Number(backgrounds[0].getAttribute("y")) +
        Number(backgrounds[0].getAttribute("height")) +
        constants.NOTE_EFFECT_NOTE_GAP,
    );
    expect(Number(lowerPath[2])).toBe(
      Number(backgrounds[1].getAttribute("y")) +
        Number(backgrounds[1].getAttribute("height")) +
        constants.NOTE_EFFECT_NOTE_GAP,
    );
    expect(Number(lowerPath[7])).toBe(
      Number(backgrounds[1].getAttribute("y")) +
        Number(backgrounds[1].getAttribute("height")) +
        constants.NOTE_EFFECT_NOTE_GAP,
    );
  });

  it("does not carry a hammer arc across an intervening rest", () => {
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({
                effect: { ...makeNote().effect, hammer: true },
              }),
            ],
          }),
          makeBeat({ status: "Rest" }),
          makeBeat({ notes: [makeNote({ value: 2 })] }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [
        makeBeatLayout({ beatIndex: 0, x: 50 }),
        makeBeatLayout({ beatIndex: 1, x: 100 }),
        makeBeatLayout({ beatIndex: 2, x: 150 }),
      ],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    expect(parent.querySelector(".tab-note-effect--hammer")).toBeNull();
  });

  it("connects tied chords to matching notes in the previous measure", () => {
    const sourceParent = makeParent();
    const previousNotes = renderMeasureNotes({
      parent: sourceParent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 1, value: 10 }),
              makeNote({ string: 2, value: 8 }),
            ],
          }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout({ x: 180, width: 40 })],
      bounds: makeBounds({ x: 0, width: 200 }),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });
    const destinationParent = makeParent();

    renderMeasureNotes({
      parent: destinationParent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 1, value: 10, kind: "Tie" }),
              makeNote({ string: 2, value: 8, kind: "Tie" }),
            ],
          }),
        ],
      ]),
      measureIndex: 1,
      beatLayouts: [makeBeatLayout({ x: 320, width: 80 })],
      bounds: makeBounds({ x: 200, width: 200 }),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
      previousNotes,
    });

    const ties = destinationParent.querySelectorAll(
      ".tab-note-effect--tie path",
    );
    const sourceBackgrounds =
      sourceParent.querySelectorAll<SVGRectElement>(".tab-note-bg");
    const destinationBackgrounds =
      destinationParent.querySelectorAll<SVGRectElement>(".tab-note-bg");
    expect(ties).toHaveLength(2);
    expect(
      Array.from(destinationParent.querySelectorAll(".tab-note-text")).map(
        (text) => text.textContent,
      ),
    ).toEqual(["(10)", "(8)"]);
    ties.forEach((tie, index) => {
      const source = sourceBackgrounds[index];
      const destination = destinationBackgrounds[index];
      const path = tie.getAttribute("d")!.split(" ");
      const expectedStart =
        Number(source.getAttribute("x")) +
        Number(source.getAttribute("width")) / 2;
      const expectedEnd =
        Number(destination.getAttribute("x")) +
        Number(destination.getAttribute("width")) / 2;

      expect(Number(path[1])).toBeCloseTo(expectedStart);
      expect(Number(path[6])).toBeCloseTo(expectedEnd);
    });
  });
});
