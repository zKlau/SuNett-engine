/**
 * @jest-environment jsdom
 */
import { attachPlaybackInput } from "../src/engine/playbackInput";
import { SnapMode } from "../src/utils/timing/snapTime";

function makeEngine() {
  return {
    timeAtPoint: jest.fn((_x: number, _y: number): number | undefined => 1500),
    snapTime: jest.fn((ms: number, _mode: string) => ms),
    seek: jest.fn(),
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

describe("attachPlaybackInput", () => {
  it("seeks to the clicked time on a plain click", () => {
    const engine = makeEngine();
    const svg = makeSvg();
    attachPlaybackInput(svg, engine);

    svg.dispatchEvent(pointer("pointerdown"));
    svg.dispatchEvent(pointer("pointerup"));

    expect(engine.seek).toHaveBeenCalledWith(1500);
  });

  it("does not seek when the pointer is dragged", () => {
    const engine = makeEngine();
    const svg = makeSvg();
    attachPlaybackInput(svg, engine);

    svg.dispatchEvent(pointer("pointerdown"));
    svg.dispatchEvent(pointer("pointermove", { clientX: 200, clientY: 200 }));
    svg.dispatchEvent(pointer("pointerup", { clientX: 200, clientY: 200 }));

    expect(engine.seek).not.toHaveBeenCalled();
  });

  it("ignores buttons other than the seek button", () => {
    const engine = makeEngine();
    const svg = makeSvg();
    attachPlaybackInput(svg, engine);

    svg.dispatchEvent(pointer("pointerdown", { button: 2 }));
    svg.dispatchEvent(pointer("pointerup", { button: 2 }));

    expect(engine.seek).not.toHaveBeenCalled();
  });

  it("applies the configured snap to the seeked time", () => {
    const engine = makeEngine();
    engine.snapTime = jest.fn((_ms: number) => 2000);
    const svg = makeSvg();
    attachPlaybackInput(svg, engine, { snap: SnapMode.Beat });

    svg.dispatchEvent(pointer("pointerdown"));
    svg.dispatchEvent(pointer("pointerup"));

    expect(engine.seek).toHaveBeenCalledWith(2000);
  });

  it("does not seek off the tab", () => {
    const engine = makeEngine();
    engine.timeAtPoint = jest.fn(() => undefined);
    const svg = makeSvg();
    attachPlaybackInput(svg, engine);

    svg.dispatchEvent(pointer("pointerdown"));
    svg.dispatchEvent(pointer("pointerup"));

    expect(engine.seek).not.toHaveBeenCalled();
  });

  it("stops seeking after it is detached", () => {
    const engine = makeEngine();
    const svg = makeSvg();
    const detach = attachPlaybackInput(svg, engine);

    detach();
    svg.dispatchEvent(pointer("pointerdown"));
    svg.dispatchEvent(pointer("pointerup"));

    expect(engine.seek).not.toHaveBeenCalled();
  });
});
