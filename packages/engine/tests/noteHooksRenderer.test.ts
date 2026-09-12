/**
 * @jest-environment jsdom
 */
import type { TabNoteOptions } from "../src/types/UI/tabNoteOptions";
import { renderMeasureNotes } from "../src/utils/tabs/notesRenderer";
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

describe("note rendering hooks", () => {
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
});
