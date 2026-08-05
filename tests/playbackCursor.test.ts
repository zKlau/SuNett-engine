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

  it("draws a vertical cursor line at the current position", () => {
    const { svg, renderer } = renderTab();

    renderer.setCursor(1000);
    const cursor = svg.querySelector(".playback-cursor");

    expect(cursor).not.toBeNull();
    expect(cursor?.getAttribute("x1")).toBe(cursor?.getAttribute("x2"));
    const y1 = Number(cursor?.getAttribute("y1"));
    const y2 = Number(cursor?.getAttribute("y2"));
    expect(y2).toBeGreaterThan(y1);
    expect(cursor?.getAttribute("stroke")).toBe(
      themeVar(ThemeVariables.COLOR_CURSOR),
    );
  });

  it("moves the cursor to a later time further right", () => {
    const { svg, renderer } = renderTab();

    renderer.setCursor(500);
    const early = Number(
      svg.querySelector(".playback-cursor")?.getAttribute("x1"),
    );
    renderer.setCursor(3000);
    const late = Number(
      svg.querySelector(".playback-cursor")?.getAttribute("x1"),
    );

    expect(late).toBeGreaterThan(early);
  });

  it("removes the cursor when set to undefined", () => {
    const { svg, renderer } = renderTab();

    renderer.setCursor(1000);
    expect(svg.querySelector(".playback-cursor")).not.toBeNull();

    renderer.setCursor(undefined);
    expect(svg.querySelector(".playback-cursor")).toBeNull();
  });

  it("keeps the cursor after a re-render", () => {
    const { svg, renderer } = renderTab();

    renderer.setCursor(1000);
    renderer.generateMeasures();

    expect(svg.querySelector(".playback-cursor")).not.toBeNull();
  });
});
