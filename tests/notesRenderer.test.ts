/**
 * @jest-environment jsdom
 */
import { renderMeasureNotes } from "../src/utils/tabs/notesRenderer";
import { TabsRendererConstants as constants } from "../src/constants/tabRendererConstants";
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
import type { TabNoteOptions } from "../src/types/UI/tabNoteOptions";

const SVG_NS = "http://www.w3.org/2000/svg";

function makeParent(): SVGGElement {
  return document.createElementNS(SVG_NS, "g");
}

describe("renderMeasureNotes", () => {
  it('renders one <g class="tab-note"> per note in the beat', () => {
    const measure = makeMeasureFromVoices([
      [
        makeBeat({
          notes: [
            makeNote({ string: 0, value: 3 }),
            makeNote({ string: 1, value: 5 }),
            makeNote({ string: 5, value: 0 }),
          ],
        }),
      ],
    ]);
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const notes = parent.querySelectorAll("g.tab-note");
    expect(notes).toHaveLength(3);
  });

  it("skips beats whose status is Rest", () => {
    const measure = makeMeasureFromVoices([
      [
        makeBeat({ status: "Rest", notes: [makeNote()] }),
        makeBeat({ notes: [makeNote()] }),
      ],
    ]);
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [
        makeBeatLayout({ beatIndex: 0 }),
        makeBeatLayout({ beatIndex: 1 }),
      ],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    expect(parent.querySelectorAll("g.tab-note")).toHaveLength(1);
  });

  it("skips individual notes whose kind is Rest", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat({ notes: [makeNote({ kind: "Rest" }), makeNote()] })],
    ]);
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    expect(parent.querySelectorAll("g.tab-note")).toHaveLength(1);
  });

  it("skips notes whose string is out of range", () => {
    const measure = makeMeasureFromVoices([
      [
        makeBeat({
          notes: [
            makeNote({ string: -1 }),
            makeNote({ string: 6 }),
            makeNote({ string: 3 }),
          ],
        }),
      ],
    ]);
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const notes = parent.querySelectorAll("g.tab-note");
    expect(notes).toHaveLength(1);
    expect(notes[0].getAttribute("data-string")).toBe("3");
  });

  it('renders the fret number for normal notes and "x" for dead notes', () => {
    const measure = makeMeasureFromVoices([
      [
        makeBeat({
          notes: [
            makeNote({ string: 0, value: 7 }),
            makeNote({ string: 1, value: 12, kind: "Dead" }),
          ],
        }),
      ],
    ]);
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const texts = parent.querySelectorAll(".tab-note-text");
    expect(texts[0].textContent).toBe("7");
    expect(texts[1].textContent).toBe("x");
  });

  it("adds data attributes and modifier classes for note metadata", () => {
    const annotatedBeat = makeBeat({
      notes: [
        makeNote({
          string: 2,
          value: 5,
          kind: "Tie",
          effect: {
            accentuated_note: false,
            ghost_note: true,
            hammer: true,
            heavy_accentuated_note: false,
            left_hand_finger: "Open",
            let_ring: true,
            palm_mute: true,
            right_hand_finger: "Open",
            slides: [],
            staccato: false,
            vibrato: false,
          },
        }),
      ],
    });
    const measure = makeMeasureFromVoices([
      [],
      [makeBeat(), makeBeat(), annotatedBeat],
    ]);
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 3,
      beatLayouts: [makeBeatLayout({ beatIndex: 2, voiceIndex: 1 })],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const note = parent.querySelector("g.tab-note");
    expect(note).not.toBeNull();
    expect(note!.getAttribute("data-fret")).toBe("5");
    expect(note!.getAttribute("data-string")).toBe("2");
    expect(note!.getAttribute("data-kind")).toBe("Tie");
    expect(note!.getAttribute("data-beat-index")).toBe("2");
    expect(note!.getAttribute("data-measure-index")).toBe("3");
    expect(note!.getAttribute("data-voice-index")).toBe("1");

    const classes = note!.getAttribute("class")!.split(" ");
    expect(classes).toEqual(
      expect.arrayContaining([
        "tab-note",
        "tab-note--tie",
        "tab-note--ghost",
        "tab-note--hammer",
        "tab-note--palm-mute",
        "tab-note--let-ring",
      ]),
    );
  });

  it("positions notes at beatLayout.x and stringY", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat({ notes: [makeNote({ string: 0 })] })],
    ]);
    const parent = makeParent();
    const bounds = makeBounds({ x: 20, y: 40, stringSpacing: 12 });

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout({ x: 77 })],
      bounds,
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const expectedY = bounds.y + constants.MEASURE_TOP_PADDING;
    const note = parent.querySelector("g.tab-note")!;
    expect(note.getAttribute("transform")).toBeNull();
    expect(note.getAttribute("x")).toBe("77");
    expect(note.getAttribute("y")).toBe(`${expectedY}`);

    const text = note.querySelector(".tab-note-text")!;
    expect(text.getAttribute("x")).toBe("77");
    expect(text.getAttribute("y")).toBe(`${expectedY}`);

    const bg = note.querySelector(".tab-note-bg")!;
    expect(Number(bg.getAttribute("x"))).toBeLessThan(77);
    expect(Number(bg.getAttribute("y"))).toBeLessThan(expectedY);
  });

  it("mirrors the string row vertically when invertStrings is set", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat({ notes: [makeNote({ string: 0 })] })],
    ]);
    const parent = makeParent();
    const bounds = makeBounds({ y: 40, stringSpacing: 12 });

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds,
      stringCount: 6,
      invertStrings: true,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    // String 0 of 6 sits on the bottom row (index 5) when inverted.
    const expectedY =
      bounds.y + constants.MEASURE_TOP_PADDING + 5 * bounds.stringSpacing;
    const note = parent.querySelector("g.tab-note")!;
    expect(note.getAttribute("y")).toBe(`${expectedY}`);
  });

  it("mirrors the string row when reverseStrings is set, and cancels with invert", () => {
    const bounds = makeBounds({ y: 40, stringSpacing: 12 });
    const rowY = (row: number) =>
      bounds.y + constants.MEASURE_TOP_PADDING + row * bounds.stringSpacing;

    const renderStringOne = (overrides: {
      reverseStrings?: boolean;
      invertStrings?: boolean;
    }) => {
      const parent = makeParent();
      renderMeasureNotes({
        parent,
        measure: makeMeasureFromVoices([
          [makeBeat({ notes: [makeNote({ string: 0 })] })],
        ]),
        measureIndex: 0,
        beatLayouts: [makeBeatLayout()],
        bounds,
        stringCount: 6,
        config: makeNoteConfig(),
        metrics: makeNoteMetrics(),
        ...overrides,
      });
      return parent.querySelector("g.tab-note")!;
    };

    expect(renderStringOne({ reverseStrings: true }).getAttribute("y")).toBe(
      `${rowY(5)}`,
    );
    expect(
      renderStringOne({
        reverseStrings: true,
        invertStrings: true,
      }).getAttribute("y"),
    ).toBe(`${rowY(0)}`);
  });

  it("omits the background rect when background is false", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat({ notes: [makeNote()] })],
    ]);
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig({ background: false }),
      metrics: makeNoteMetrics({ background: false }),
    });

    expect(parent.querySelector(".tab-note-bg")).toBeNull();
    expect(parent.querySelector(".tab-note-text")).not.toBeNull();
  });

  it("uses the custom render hook when it returns an element", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat({ notes: [makeNote()] })],
    ]);
    const parent = makeParent();
    const render: TabNoteOptions["render"] = (ctx) => {
      const circle = ctx.createElement("circle");
      circle.setAttribute("data-custom", "yes");
      return circle;
    };

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig({ render }),
      metrics: makeNoteMetrics({ render }),
    });

    expect(parent.querySelector("g.tab-note")).toBeNull();
    expect(parent.querySelector('circle[data-custom="yes"]')).not.toBeNull();
  });

  it("falls back to the default when the render hook returns null", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat({ notes: [makeNote()] })],
    ]);
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig({ render: () => null }),
      metrics: makeNoteMetrics({ render: () => null }),
    });

    expect(parent.querySelector("g.tab-note")).not.toBeNull();
  });

  it("passes the default element and the note context to onCreate", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat({ notes: [makeNote({ string: 2, value: 4 })] })],
    ]);
    const parent = makeParent();
    const onCreate = jest.fn();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig({ onCreate }),
      metrics: makeNoteMetrics({ onCreate }),
    });

    expect(onCreate).toHaveBeenCalledTimes(1);
    const [element, ctx] = onCreate.mock.calls[0];
    expect(element.getAttribute("class")).toContain("tab-note");
    expect(ctx.note.value).toBe(4);
    expect(ctx.note.string).toBe(2);
  });

  it("fires onClick and marks the element interactive", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat({ notes: [makeNote()] })],
    ]);
    const parent = makeParent();
    const onClick = jest.fn();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig({ onClick }),
      metrics: makeNoteMetrics({ onClick }),
    });

    const note = parent.querySelector("g.tab-note")!;
    expect(note.getAttribute("cursor")).toBe("pointer");

    note.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
    const [ctx, event] = onClick.mock.calls[0];
    expect(ctx.note).toBeDefined();
    expect(event.type).toBe("click");
  });

  it("fires pointerenter and pointerleave", () => {
    const measure = makeMeasureFromVoices([
      [makeBeat({ notes: [makeNote()] })],
    ]);
    const parent = makeParent();
    const onPointerEnter = jest.fn();
    const onPointerLeave = jest.fn();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig({ onPointerEnter, onPointerLeave }),
      metrics: makeNoteMetrics({ onPointerEnter, onPointerLeave }),
    });

    const note = parent.querySelector("g.tab-note")!;
    note.dispatchEvent(new Event("pointerenter"));
    note.dispatchEvent(new Event("pointerleave"));

    expect(onPointerEnter).toHaveBeenCalledTimes(1);
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
  });

  it("wraps ghost-note fret values in parentheses", () => {
    const measure = makeMeasureFromVoices([
      [
        makeBeat({
          notes: [
            makeNote({
              value: 7,
              effect: {
                ...makeNote().effect,
                ghost_note: true,
              },
            }),
          ],
        }),
      ],
    ]);
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure,
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    expect(parent.querySelector(".tab-note-text")!.textContent).toBe("(7)");
  });

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
    expect(Number(tiePath[5]) - Number(tiePath[2])).toBe(
      constants.NOTE_EFFECT_SLUR_HEIGHT,
    );
  });

  it("bows ties and hammer-ons toward each other within a chord", () => {
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 0, value: 4 }),
              makeNote({
                string: 1,
                value: 0,
                effect: { ...makeNote().effect, hammer: true },
              }),
            ],
          }),
          makeBeat({
            notes: [
              makeNote({ string: 0, value: 4, kind: "Tie" }),
              makeNote({
                string: 1,
                value: 2,
                effect: { ...makeNote().effect, hammer: true },
              }),
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

    const tie = parent
      .querySelector(".tab-note-effect--tie path")!
      .getAttribute("d")!
      .split(" ");
    const hammer = parent
      .querySelector(".tab-note-effect--hammer path")!
      .getAttribute("d")!
      .split(" ");

    expect(Number(tie[5])).toBeGreaterThan(Number(tie[2]));
    expect(Number(hammer[5])).toBeLessThan(Number(hammer[2]));
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
        Number(source.getAttribute("width")) +
        constants.NOTE_EFFECT_NOTE_GAP;
      const expectedEnd =
        Number(destination.getAttribute("x")) - constants.NOTE_EFFECT_NOTE_GAP;

      expect(Number(path[1])).toBeCloseTo(expectedStart);
      expect(Number(path[6])).toBeCloseTo(expectedEnd);
    });
  });

  it("renders one staccato dot for an affected chord beat", () => {
    const parent = makeParent();
    const bounds = makeBounds({ y: 20 });
    const staccatoEffect = {
      ...makeNote().effect,
      staccato: true,
    };

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 0, effect: staccatoEffect }),
              makeNote({ string: 1, effect: staccatoEffect }),
            ],
          }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout({ x: 75 })],
      bounds,
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const dots = parent.querySelectorAll(".tab-note-effect--staccato circle");
    expect(dots).toHaveLength(1);
    expect(dots[0].getAttribute("cx")).toBe("75");
    expect(dots[0].getAttribute("cy")).toBe(
      `${
        bounds.y +
        constants.MEASURE_TOP_PADDING -
        constants.NOTE_EFFECT_STACCATO_OFFSET
      }`,
    );
  });

  it("renders one beat-width vibrato line above an affected chord", () => {
    const parent = makeParent();
    const bounds = makeBounds({ y: 20 });
    const vibratoEffect = {
      ...makeNote().effect,
      vibrato: true,
    };

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({
            notes: [
              makeNote({ string: 1, effect: vibratoEffect }),
              makeNote({ string: 2, effect: vibratoEffect }),
            ],
          }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout({ x: 100, width: 180 })],
      bounds,
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const vibrato = parent.querySelectorAll(".tab-note-effect--vibrato path");
    const noteBackground = parent.querySelector(".tab-note-bg")!;
    const expectedY =
      bounds.y +
      constants.MEASURE_TOP_PADDING -
      constants.NOTE_EFFECT_VIBRATO_OFFSET;
    const path = vibrato[0].getAttribute("d")!;

    expect(vibrato).toHaveLength(1);
    expect(path).toMatch(
      new RegExp(`^M ${noteBackground.getAttribute("x")} ${expectedY} `),
    );
    expect(path).toContain(
      `L ${100 + 90 - constants.NOTE_EFFECT_NOTE_GAP} ${expectedY}`,
    );
    expect(path.match(/L /g)!.length).toBeGreaterThan(10);
    expect(vibrato[0].getAttribute("stroke")).toContain("--sunett-color-muted");
  });

  it("omits linked techniques when no following note exists", () => {
    const note = makeNote({
      effect: {
        ...makeNote().effect,
        hammer: true,
        slides: ["ShiftSlideTo"],
      },
    });
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([[makeBeat({ notes: [note] })]]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    expect(parent.querySelector(".tab-note-effect--hammer")).toBeNull();
    expect(parent.querySelector(".tab-note-effect--slide")).toBeNull();
    expect(parent.querySelector(".tab-note")).not.toBeNull();
  });

  it("renders bend points, direction, value, arrow, and label", () => {
    const note = makeNote({
      effect: {
        ...makeNote().effect,
        bend: {
          kind: "BendRelease",
          value: 100,
          semitone_length: 100,
          max_position: 60,
          max_value: 100,
          points: [
            { position: 0, value: 0, vibrato: false },
            { position: 30, value: 100, vibrato: false },
            { position: 60, value: 0, vibrato: false },
          ],
        },
      },
    });
    const parent = makeParent();

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([[makeBeat({ notes: [note] })]]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const effect = parent.querySelector(".tab-note-effect--bend")!;
    expect(effect.getAttribute("data-bend-kind")).toBe("BendRelease");
    expect(effect.getAttribute("data-bend-value")).toBe("100");
    expect(effect.querySelectorAll("path")).toHaveLength(2);
    expect(effect.querySelector("text")!.textContent).toBe("full");
    expect(effect.querySelector("path")!.getAttribute("stroke")).toContain(
      "--sunett-color-note-fg",
    );
  });

  it("groups consecutive palm-muted beats into P.M. notation spans", () => {
    const palmMuted = (value: number) =>
      makeNote({
        value,
        effect: { ...makeNote().effect, palm_mute: true },
      });
    const parent = makeParent();
    const bounds = makeBounds({ y: 20, stringSpacing: 12 });

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([
        [
          makeBeat({ notes: [palmMuted(0)] }),
          makeBeat({ notes: [palmMuted(0)] }),
          makeBeat({ notes: [makeNote({ value: 12 })] }),
          makeBeat({ notes: [palmMuted(0)] }),
        ],
      ]),
      measureIndex: 0,
      beatLayouts: [
        makeBeatLayout({ beatIndex: 0, x: 40, width: 40 }),
        makeBeatLayout({ beatIndex: 1, x: 80, width: 40 }),
        makeBeatLayout({ beatIndex: 2, x: 120, width: 40 }),
        makeBeatLayout({ beatIndex: 3, x: 160, width: 40 }),
      ],
      bounds,
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const spans = parent.querySelectorAll(".tab-note-effect--palm-mute");
    expect(spans).toHaveLength(2);
    expect(spans[0].getAttribute("data-start-beat")).toBe("0");
    expect(spans[0].getAttribute("data-end-beat")).toBe("1");
    expect(spans[0].querySelector("text")!.textContent).toBe("P. M.");
    expect(spans[0].querySelector("text")!.getAttribute("fill")).toContain(
      "--sunett-color-muted",
    );
    expect(spans[0].querySelectorAll("path")).toHaveLength(2);
    expect(
      spans[0].querySelector("path")!.getAttribute("stroke-dasharray"),
    ).not.toBeNull();
    expect(spans[1].getAttribute("data-start-beat")).toBe("3");
    expect(spans[1].getAttribute("data-end-beat")).toBe("3");
    expect(spans[1].querySelector("path")).toBeNull();

    const expectedY =
      bounds.y +
      constants.MEASURE_TOP_PADDING +
      -constants.NOTE_EFFECT_SPAN_OFFSET;
    expect(Number(spans[0].querySelector("text")!.getAttribute("y"))).toBe(
      expectedY,
    );
  });

  it("renders standalone symbols above and below the fret number", () => {
    const note = makeNote({
      string: 2,
      effect: {
        ...makeNote().effect,
        vibrato: true,
        palm_mute: true,
        let_ring: true,
        staccato: true,
        accentuated_note: true,
        trill: {
          fret: 8,
          duration: {
            value: 16,
            dotted: false,
            double_dotted: false,
            min_time: 0,
            tuplet_enters: 1,
            tuplet_times: 1,
          },
        },
        harmonic: { kind: "Natural" },
      },
    });
    const parent = makeParent();
    const bounds = makeBounds({ y: 20, stringSpacing: 12 });

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([[makeBeat({ notes: [note] })]]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds,
      stringCount: 6,
      config: makeNoteConfig(),
      metrics: makeNoteMetrics(),
    });

    const noteY =
      bounds.y + constants.MEASURE_TOP_PADDING + 2 * bounds.stringSpacing;
    const effectNames = [
      "vibrato",
      "palm-mute",
      "let-ring",
      "staccato",
      "accent",
      "trill",
      "harmonic",
    ];
    effectNames.forEach((effect) => {
      expect(
        parent.querySelector(`.tab-note-effect--${effect}`),
      ).not.toBeNull();
    });

    const palmMute = parent.querySelector(".tab-note-effect--palm-mute text")!;
    const accent = parent.querySelector(".tab-note-effect--accent text")!;
    expect(Number(palmMute.getAttribute("y"))).toBeLessThan(noteY);
    expect(Number(accent.getAttribute("y"))).toBeLessThan(noteY);
    expect(
      parent
        .querySelector(".tab-note-effect--let-ring path")!
        .getAttribute("stroke-dasharray"),
    ).not.toBeNull();
    expect(
      parent.querySelector(".tab-note-effect--harmonic polygon"),
    ).not.toBeNull();
  });

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
    expect(slurs[0].getAttribute("d")).toContain("Q");
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

  it("uses the configured class prefix for notes and effect symbols", () => {
    const parent = makeParent();
    const note = makeNote({
      effect: { ...makeNote().effect, vibrato: true },
    });

    renderMeasureNotes({
      parent,
      measure: makeMeasureFromVoices([[makeBeat({ notes: [note] })]]),
      measureIndex: 0,
      beatLayouts: [makeBeatLayout()],
      bounds: makeBounds(),
      stringCount: 6,
      config: makeNoteConfig({ classPrefix: "fret" }),
      metrics: makeNoteMetrics(),
    });

    expect(parent.querySelector(".fret")).not.toBeNull();
    expect(parent.querySelector(".fret-effect--vibrato")).not.toBeNull();
    expect(parent.querySelector(".tab-note-effect")).toBeNull();
  });
});
