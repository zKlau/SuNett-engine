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
    });

    const note = parent.querySelector("g.tab-note")!;
    note.dispatchEvent(new Event("pointerenter"));
    note.dispatchEvent(new Event("pointerleave"));

    expect(onPointerEnter).toHaveBeenCalledTimes(1);
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
  });
});
