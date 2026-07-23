/**
 * @jest-environment jsdom
 */
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import {
  makeBeat,
  makeMeasureFromVoices,
  makeNote,
  makeSong,
} from "./fixtures";
import type { Track } from "../src/types/track";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const emptyMeasure = () => makeMeasureFromVoices([[makeBeat({ notes: [] })]]);
const fullMeasure = () =>
  makeMeasureFromVoices([
    [makeBeat({ notes: [makeNote({ string: 1, value: 3 })] })],
  ]);

function makeTrackWithMeasures(
  measures: ReturnType<typeof emptyMeasure>[],
): Track {
  return {
    name: "Track",
    strings: Array.from({ length: 6 }, (_, index) => [index, 40 + index]),
    measures,
  } as unknown as Track;
}

function setupSvg(): SVGSVGElement {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  return document.querySelector("#tabs") as SVGSVGElement;
}

function renderedIndices(svg: SVGSVGElement): string[] {
  return Array.from(svg.querySelectorAll(".measure")).map(
    (m) => m.getAttribute("measure-index") ?? "",
  );
}

describe("TabsRenderer hideEmptyMeasures", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("renders every measure when the option is off", () => {
    const svg = setupSvg();
    const track = makeTrackWithMeasures([
      emptyMeasure(),
      fullMeasure(),
      fullMeasure(),
      emptyMeasure(),
    ]);

    new TabsRenderer(makeSong([track])).generateMeasures();

    expect(renderedIndices(svg)).toEqual(["0", "1", "2", "3"]);
  });

  it("hides leading and trailing empty measures but keeps in-between ones", () => {
    const svg = setupSvg();
    const track = makeTrackWithMeasures([
      emptyMeasure(),
      emptyMeasure(),
      fullMeasure(),
      emptyMeasure(),
      fullMeasure(),
      emptyMeasure(),
    ]);

    new TabsRenderer(makeSong([track])).generateMeasures(0, {
      hideEmptyMeasures: true,
    });

    expect(renderedIndices(svg)).toEqual(["2", "3", "4"]);
  });

  it("draws the tuning labels on the first visible measure after trimming", () => {
    const svg = setupSvg();
    const track = makeTrackWithMeasures([
      emptyMeasure(),
      emptyMeasure(),
      fullMeasure(),
    ]);

    new TabsRenderer(makeSong([track])).generateMeasures(0, {
      hideEmptyMeasures: true,
    });

    const firstMeasure = svg.querySelector(".measure")!;
    expect(firstMeasure.getAttribute("measure-index")).toBe("2");
    expect(firstMeasure.querySelectorAll(".tuning-label").length).toBe(6);
  });
});
