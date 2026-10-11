/**
 * @jest-environment jsdom
 */
import { NoteClassRegistry } from "../src/engine/noteClasses";
import type { NoteRenderContext } from "../src/types/UI/noteRenderContext";
import { makeBeat, makeMeasure, makeNote } from "./fixtures";

const SVG_NS = "http://www.w3.org/2000/svg";
const REF = { measureIndex: 1, voiceIndex: 0, beatIndex: 2, string: 3 };

function makeContext(): NoteRenderContext {
  return {
    note: makeNote({ string: 3 }),
    beat: makeBeat(),
    measure: makeMeasure(1),
    measureIndex: 1,
    voiceIndex: 0,
    beatIndex: 2,
    x: 0,
    y: 0,
    fontSize: 10,
    createElement: (tag) => document.createElementNS(SVG_NS, tag),
  };
}

function renderDefault(registry: NoteClassRegistry, root: SVGSVGElement) {
  const element = document.createElementNS(SVG_NS, "g");
  registry.wrap().onCreate?.(element, makeContext());
  root.append(element);
  return element;
}

describe("NoteClassRegistry", () => {
  it("applies registered classes when a note is created", () => {
    const registry = new NoteClassRegistry();
    const root = document.createElementNS(SVG_NS, "svg");
    registry.set(REF, ["hit"]);

    const element = renderDefault(registry, root);

    expect(element.classList.contains("hit")).toBe(true);
    expect(element.getAttribute("data-note-ref")).toBe("1:0:2:3");
  });

  it("updates rendered notes in place when classes change", () => {
    const registry = new NoteClassRegistry();
    const root = document.createElementNS(SVG_NS, "svg");
    const element = renderDefault(registry, root);

    registry.set(REF, ["hit"], root);
    registry.set(REF, ["miss"], root);

    expect(element.classList.contains("hit")).toBe(false);
    expect(element.classList.contains("miss")).toBe(true);
    expect(registry.get(REF)).toEqual(["miss"]);
  });

  it("clears every class from rendered notes", () => {
    const registry = new NoteClassRegistry();
    const root = document.createElementNS(SVG_NS, "svg");
    const element = renderDefault(registry, root);
    registry.set(REF, ["hit"], root);

    registry.clear(root);

    expect(element.classList.contains("hit")).toBe(false);
    expect(registry.get(REF)).toEqual([]);
  });

  it("decorates custom-rendered notes and keeps the caller's hooks", () => {
    const registry = new NoteClassRegistry();
    const onCreate = jest.fn();
    registry.set(REF, ["active"]);

    const options = registry.wrap({
      render: (context) => context.createElement("circle"),
      onCreate,
    });
    const custom = options.render?.(makeContext());
    const group = document.createElementNS(SVG_NS, "g");
    options.onCreate?.(group, makeContext());

    expect(custom?.classList.contains("active")).toBe(true);
    expect(onCreate).toHaveBeenCalledWith(group, expect.anything());
  });
});
