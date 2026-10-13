/**
 * @jest-environment jsdom
 */
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import {
  makeBeat,
  makeMeasureFromVoices,
  makeNote,
  makeSong,
  makeTrack,
} from "./fixtures";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function setupSvg(): SVGSVGElement {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  return document.querySelector("#tabs") as SVGSVGElement;
}

function stubRect(svg: SVGSVGElement, top: () => number): void {
  svg.getBoundingClientRect = () => {
    const height = Number(svg.getAttribute("height")) || 0;
    const y = top();
    return {
      top: y,
      bottom: y + height,
      left: 0,
      right: 440,
      width: 440,
      height,
      x: 0,
      y,
      toJSON: () => ({}),
    } as DOMRect;
  };
}

function renderedIndices(svg: SVGSVGElement): number[] {
  return Array.from(svg.querySelectorAll(".measure")).map((group) =>
    Number(group.getAttribute("measure-index")),
  );
}

describe("TabsRenderer virtualization", () => {
  const MEASURE_COUNT = 60;
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;

  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
    (window as unknown as { innerHeight: number }).innerHeight = 300;
  });

  afterAll(() => {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancel;
  });

  function makeSixtyMeasureSong() {
    const measures = Array.from({ length: MEASURE_COUNT }, () =>
      makeMeasureFromVoices([
        [makeBeat({ notes: [makeNote({ string: 0, value: 3 })] })],
      ]),
    );
    return makeSong([makeTrack(6, measures)]);
  }

  it("materialises only a window of measures near the viewport", () => {
    const svg = setupSvg();
    stubRect(svg, () => 0);

    new TabsRenderer(makeSixtyMeasureSong()).generateMeasures();

    const indices = renderedIndices(svg);
    expect(indices.length).toBeGreaterThan(0);
    expect(indices.length).toBeLessThan(MEASURE_COUNT);
    expect(indices[0]).toBe(0);
    expect(Math.max(...indices)).toBeLessThan(MEASURE_COUNT - 1);
  });

  it("swaps in later measures as the tab scrolls, dropping earlier ones", () => {
    const svg = setupSvg();
    let scrollTop = 0;
    stubRect(svg, () => scrollTop);

    new TabsRenderer(makeSixtyMeasureSong()).generateMeasures();
    const top = renderedIndices(svg);

    const height = Number(svg.getAttribute("height"));
    scrollTop = -(height - 300);
    window.dispatchEvent(new Event("scroll"));

    const bottom = renderedIndices(svg);
    expect(Math.max(...bottom)).toBe(MEASURE_COUNT - 1);
    expect(Math.min(...bottom)).toBeGreaterThan(Math.max(...top));
    expect(bottom.length).toBeLessThan(MEASURE_COUNT);
  });

  it("keeps the selection overlay layered above the measures container", () => {
    const svg = setupSvg();
    stubRect(svg, () => 0);

    new TabsRenderer(makeSixtyMeasureSong()).generateMeasures();

    expect(svg.querySelector("g.measures")).not.toBeNull();
  });

  it("renders every measure when virtualization is disabled", () => {
    const svg = setupSvg();
    stubRect(svg, () => 0);

    new TabsRenderer(makeSixtyMeasureSong()).generateMeasures(0, {
      virtualize: false,
    });

    expect(renderedIndices(svg)).toHaveLength(MEASURE_COUNT);
  });
});
