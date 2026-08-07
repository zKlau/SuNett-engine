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
import type { CursorOptions } from "../src/types/UI/cursorOptions";

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
  const transform = (element as SVGGElement | null)?.style.transform ?? "";
  const match = transform.match(/translate\(\s*(-?[\d.]+)/);
  return match ? Number(match[1]) : NaN;
}

function renderTab(cursor?: CursorOptions): {
  svg: SVGSVGElement;
  renderer: TabsRenderer;
} {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  const svg = document.querySelector("#tabs") as SVGSVGElement;
  const song = makeSong([makeTrack(6, [measureWithBeat(), measureWithBeat()])]);
  const renderer = new TabsRenderer(song, { cursor });
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
    const cursor = document.querySelector(".playback-cursor") as SVGGElement;

    expect(overlay).not.toBeNull();
    expect(svg.querySelector(".playback-cursor")).toBeNull();
    expect(cursor.parentElement).toBe(overlay);
    expect(cursor.style.transform).toContain("translate");
    expect(cursor.querySelector("path")?.getAttribute("fill")).toBe(
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

describe("custom playback cursor", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("renders consumer SVG markup instead of the default marker", () => {
    const { renderer } = renderTab({
      svg: '<svg viewBox="0 0 10 40"><rect class="mine" width="10" height="40" /></svg>',
    });

    renderer.setCursor(1000);
    const cursor = document.querySelector(".playback-cursor") as SVGGElement;

    expect(cursor.querySelector("rect.mine")).not.toBeNull();
    expect(cursor.querySelector("path")).toBeNull();
  });

  it("renders artwork returned by a factory", () => {
    const { renderer } = renderTab({
      svg: (doc) => {
        const art = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
        art.setAttribute("viewBox", "0 0 4 20");
        const circle = doc.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle",
        );
        art.append(circle);
        return art;
      },
    });

    renderer.setCursor(1000);

    expect(document.querySelector(".playback-cursor circle")).not.toBeNull();
  });

  it("adds the consumer class name alongside playback-cursor", () => {
    const { renderer } = renderTab({ className: "my-cursor" });

    renderer.setCursor(1000);
    const cursor = document.querySelector(".playback-cursor");

    expect(cursor?.classList.contains("my-cursor")).toBe(true);
  });

  it("falls back to the default marker for unparseable markup", () => {
    const { renderer } = renderTab({ svg: "not svg at all" });

    renderer.setCursor(1000);

    expect(document.querySelector(".playback-cursor path")).not.toBeNull();
  });
});
