/**
 * @jest-environment jsdom
 */
import { attachSelectionInput } from "../src/engine/selectionInput";
import type { Selection } from "../src/types/selection";

function makeEngine() {
  return {
    timeAtPoint: jest.fn((_x: number, _y: number): number | undefined => 1000),
    selectionAt: jest.fn(
      (_x: number, _y: number): Selection | undefined => undefined,
    ),
    getActiveTrackIndex: jest.fn((): number => 0),
    snapTime: jest.fn((ms: number, _mode: string) => ms),
    beginDraftSelection: jest.fn(),
    updateDraftSelection: jest.fn(),
    commitDraftSelection: jest.fn((): Selection | undefined => undefined),
    cancelDraftSelection: jest.fn(),
    removeSelection: jest.fn(),
    updateSelection: jest.fn(),
  };
}

function makeSvg(): SVGSVGElement {
  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as SVGSVGElement;
  document.body.append(svg);
  return svg;
}

function pointer(type: string, init: Partial<MouseEventInit> = {}): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    clientX: 10,
    clientY: 10,
    button: 0,
    ...init,
  });
}

function touch(type: string, init: Partial<MouseEventInit> = {}): MouseEvent {
  const event = pointer(type, init);
  Object.defineProperty(event, "pointerType", { value: "touch" });
  return event;
}

describe("attachSelectionInput", () => {
  it("begins a draft on pointer down over the tab", () => {
    const engine = makeEngine();
    const svg = makeSvg();
    attachSelectionInput(svg, engine);

    svg.dispatchEvent(pointer("pointerdown"));

    expect(engine.beginDraftSelection).toHaveBeenCalledWith(1000);
  });

  it("updates the draft as the pointer moves", () => {
    const engine = makeEngine();
    engine.timeAtPoint = jest.fn((_x: number, _y: number) => 2000);
    const svg = makeSvg();
    attachSelectionInput(svg, engine);

    svg.dispatchEvent(pointer("pointerdown"));
    svg.dispatchEvent(pointer("pointermove"));

    expect(engine.updateDraftSelection).toHaveBeenCalledWith({ endMs: 2000 });
  });

  it("commits a dragged range with onCreate extras", () => {
    const times = [0, 2000];
    const engine = makeEngine();
    engine.timeAtPoint = jest.fn(
      (_x: number, _y: number) => times.shift() ?? 2000,
    );
    const svg = makeSvg();
    attachSelectionInput(svg, engine, {
      onCreate: () => ({ label: "loop" }),
    });

    svg.dispatchEvent(pointer("pointerdown"));
    svg.dispatchEvent(pointer("pointerup"));

    expect(engine.commitDraftSelection).toHaveBeenCalledWith({ label: "loop" });
    expect(engine.cancelDraftSelection).not.toHaveBeenCalled();
  });

  it("snaps drag times through the engine", () => {
    const engine = makeEngine();
    engine.timeAtPoint = jest.fn((_x: number, _y: number) => 1234);
    engine.snapTime = jest.fn((_ms: number, _mode: string) => 1000);
    const svg = makeSvg();
    attachSelectionInput(svg, engine, { snap: "Beat" });

    svg.dispatchEvent(pointer("pointerdown"));

    expect(engine.snapTime).toHaveBeenCalledWith(1234, "Beat");
    expect(engine.beginDraftSelection).toHaveBeenCalledWith(1000);
  });

  it("scopes a created selection to the active track when trackScoped", () => {
    const times = [0, 2000];
    const engine = makeEngine();
    engine.timeAtPoint = jest.fn(
      (_x: number, _y: number) => times.shift() ?? 2000,
    );
    engine.getActiveTrackIndex = jest.fn(() => 3);
    const svg = makeSvg();
    attachSelectionInput(svg, engine, { trackScoped: true });

    svg.dispatchEvent(pointer("pointerdown"));
    svg.dispatchEvent(pointer("pointerup"));

    expect(engine.commitDraftSelection).toHaveBeenCalledWith({ trackIndex: 3 });
  });

  it("cancels a too-short drag instead of committing", () => {
    const engine = makeEngine();
    const svg = makeSvg();
    attachSelectionInput(svg, engine, { minDurationMs: 40 });

    svg.dispatchEvent(pointer("pointerdown"));
    svg.dispatchEvent(pointer("pointerup"));

    expect(engine.cancelDraftSelection).toHaveBeenCalled();
    expect(engine.commitDraftSelection).not.toHaveBeenCalled();
  });

  it("deletes the selection under the pointer on right-click", () => {
    const target: Selection = { id: "x", songId: "s", startMs: 0, endMs: 10 };
    const engine = makeEngine();
    engine.selectionAt = jest.fn((_x: number, _y: number) => target);
    const svg = makeSvg();
    attachSelectionInput(svg, engine);

    const event = pointer("contextmenu");
    const prevented = jest.spyOn(event, "preventDefault");
    svg.dispatchEvent(event);

    expect(engine.removeSelection).toHaveBeenCalledWith("x");
    expect(prevented).toHaveBeenCalled();
  });

  it("edits the selection under the pointer on double-click", () => {
    const target: Selection = { id: "x", songId: "s", startMs: 0, endMs: 10 };
    const engine = makeEngine();
    engine.selectionAt = jest.fn((_x: number, _y: number) => target);
    const svg = makeSvg();
    attachSelectionInput(svg, engine, {
      onEdit: () => ({ label: "renamed" }),
    });

    svg.dispatchEvent(pointer("dblclick"));

    expect(engine.updateSelection).toHaveBeenCalledWith("x", {
      label: "renamed",
    });
  });

  it("does not create on a non-configured button", () => {
    const engine = makeEngine();
    const svg = makeSvg();
    attachSelectionInput(svg, engine, { createButton: 0 });

    svg.dispatchEvent(pointer("pointerdown", { button: 2 }));

    expect(engine.beginDraftSelection).not.toHaveBeenCalled();
  });

  it("stops responding after the returned detach runs", () => {
    const engine = makeEngine();
    const svg = makeSvg();
    const detach = attachSelectionInput(svg, engine);

    detach();
    svg.dispatchEvent(pointer("pointerdown"));

    expect(engine.beginDraftSelection).not.toHaveBeenCalled();
  });

  it("suppresses native text selection on the tab element", () => {
    const svg = makeSvg();
    attachSelectionInput(svg, makeEngine());

    expect(svg.style.userSelect).toBe("none");
  });

  it("leaves touch scrolling enabled by default", () => {
    const svg = makeSvg();
    attachSelectionInput(svg, makeEngine());

    expect(svg.style.touchAction).not.toBe("none");
  });
});

describe("attachSelectionInput on touch", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("waits for a press-and-hold before selecting", () => {
    jest.useFakeTimers();
    const engine = makeEngine();
    const svg = makeSvg();
    attachSelectionInput(svg, engine, { holdDurationMs: 400 });

    svg.dispatchEvent(touch("pointerdown"));
    expect(engine.beginDraftSelection).not.toHaveBeenCalled();

    jest.advanceTimersByTime(400);
    expect(engine.beginDraftSelection).toHaveBeenCalledWith(1000);
  });

  it("cancels the hold when the finger moves first, so touch scrolls", () => {
    jest.useFakeTimers();
    const engine = makeEngine();
    const svg = makeSvg();
    attachSelectionInput(svg, engine, { holdDurationMs: 400 });

    svg.dispatchEvent(touch("pointerdown"));
    svg.dispatchEvent(touch("pointermove", { clientX: 40, clientY: 40 }));
    jest.advanceTimersByTime(400);

    expect(engine.beginDraftSelection).not.toHaveBeenCalled();
  });

  it("selects immediately when holdToSelect is disabled", () => {
    const engine = makeEngine();
    const svg = makeSvg();
    attachSelectionInput(svg, engine, { holdToSelect: false });

    svg.dispatchEvent(touch("pointerdown"));

    expect(engine.beginDraftSelection).toHaveBeenCalledWith(1000);
  });

  it("blocks touch scrolling when holdToSelect is disabled", () => {
    const svg = makeSvg();
    attachSelectionInput(svg, makeEngine(), { holdToSelect: false });

    expect(svg.style.touchAction).toBe("none");
  });

  it("restores styles on detach", () => {
    const svg = makeSvg();
    const detach = attachSelectionInput(svg, makeEngine(), {
      holdToSelect: false,
    });

    detach();

    expect(svg.style.userSelect).toBe("");
    expect(svg.style.touchAction).not.toBe("none");
  });
});
