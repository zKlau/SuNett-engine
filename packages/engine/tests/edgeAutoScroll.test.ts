/**
 * @jest-environment jsdom
 */
import { createEdgeAutoScroll } from "../src/engine/edgeAutoScroll";

function svgElement(): SVGSVGElement {
  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as SVGSVGElement;
  document.body.append(svg);
  return svg;
}

describe("createEdgeAutoScroll", () => {
  let scheduled: Map<number, FrameRequestCallback>;
  let counter: number;
  let scrollBy: jest.Mock;
  let originalScrollBy: typeof window.scrollBy;

  beforeEach(() => {
    scheduled = new Map();
    counter = 0;
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      counter += 1;
      scheduled.set(counter, cb);
      return counter;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => {
      scheduled.delete(id);
    }) as typeof window.cancelAnimationFrame;
    originalScrollBy = window.scrollBy;
    scrollBy = jest.fn();
    window.scrollBy = scrollBy as unknown as typeof window.scrollBy;
  });

  afterEach(() => {
    window.scrollBy = originalScrollBy;
  });

  function runFrame(): void {
    const entry = scheduled.entries().next().value;
    if (!entry) {
      return;
    }
    scheduled.delete(entry[0]);
    entry[1](0);
  }

  it("scrolls down and re-extends when the pointer nears the bottom edge", () => {
    const onScroll = jest.fn();
    const auto = createEdgeAutoScroll(svgElement(), onScroll);

    auto.track(window.innerHeight - 1);
    runFrame();

    expect(scrollBy.mock.calls[0][1]).toBeGreaterThan(0);
    expect(onScroll).toHaveBeenCalled();
  });

  it("scrolls up when the pointer nears the top edge", () => {
    const auto = createEdgeAutoScroll(svgElement(), jest.fn());

    auto.track(1);
    runFrame();

    expect(scrollBy.mock.calls[0][1]).toBeLessThan(0);
  });

  it("does not scroll while the pointer stays away from the edges", () => {
    const onScroll = jest.fn();
    const auto = createEdgeAutoScroll(svgElement(), onScroll);

    auto.track(Math.floor(window.innerHeight / 2));
    runFrame();

    expect(scrollBy).not.toHaveBeenCalled();
    expect(onScroll).not.toHaveBeenCalled();
  });

  it("stops scrolling after stop", () => {
    const onScroll = jest.fn();
    const auto = createEdgeAutoScroll(svgElement(), onScroll);

    auto.track(window.innerHeight - 1);
    auto.stop();
    runFrame();

    expect(onScroll).not.toHaveBeenCalled();
  });
});
