/**
 * @jest-environment jsdom
 */
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import { ThemeVariables, themeVar } from "../src/theme/variables";
import {
  makeBeat,
  makeMeasureFromVoices,
  makeNote,
  makeSong,
  makeTrack,
} from "./fixtures";
import type { Measure } from "../src/types/measure";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function measureWithBeat(): Measure {
  return makeMeasureFromVoices([
    [makeBeat({ notes: [makeNote({ string: 1, value: 3 })] })],
  ]);
}

function translateX(element: Element | null): number {
  const transform = (element as SVGLineElement | null)?.style.transform ?? "";
  const match = transform.match(/translate\(\s*(-?[\d.]+)/);
  return match ? Number(match[1]) : NaN;
}

function renderTab(): { svg: SVGSVGElement; renderer: TabsRenderer } {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  const svg = document.querySelector("#tabs") as SVGSVGElement;
  const song = makeSong([makeTrack(6, [measureWithBeat(), measureWithBeat()])]);
  const renderer = new TabsRenderer(song);
  renderer.generateMeasures();
  return { svg, renderer };
}

describe("playback cursor rendering", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("draws the cursor in a separate overlay layer on top of the tab", () => {
    const { svg, renderer } = renderTab();

    renderer.setCursor(1000);
    const overlay = document.querySelector(".playback-cursor-layer");
    const cursor = document.querySelector(".playback-cursor") as SVGLineElement;

    expect(overlay).not.toBeNull();
    expect(svg.querySelector(".playback-cursor")).toBeNull();
    expect(cursor.parentElement).toBe(overlay);
    expect(cursor.getAttribute("x1")).toBe(cursor.getAttribute("x2"));
    expect(Number(cursor.getAttribute("y2"))).toBeGreaterThan(0);
    expect(cursor.style.transform).toContain("translate");
    expect(cursor.getAttribute("stroke")).toBe(
      themeVar(ThemeVariables.COLOR_CURSOR),
    );
  });

  it("moves the cursor to a later time further right", () => {
    const { renderer } = renderTab();

    renderer.setCursor(500);
    const early = translateX(document.querySelector(".playback-cursor"));
    renderer.setCursor(3000);
    const late = translateX(document.querySelector(".playback-cursor"));

    expect(late).toBeGreaterThan(early);
  });

  it("removes the cursor overlay when set to undefined", () => {
    const { renderer } = renderTab();

    renderer.setCursor(1000);
    expect(document.querySelector(".playback-cursor")).not.toBeNull();

    renderer.setCursor(undefined);
    expect(document.querySelector(".playback-cursor")).toBeNull();
    expect(document.querySelector(".playback-cursor-layer")).toBeNull();
  });

  it("keeps the cursor after a re-render", () => {
    const { renderer } = renderTab();

    renderer.setCursor(1000);
    renderer.generateMeasures();

    expect(document.querySelector(".playback-cursor")).not.toBeNull();
  });
});
