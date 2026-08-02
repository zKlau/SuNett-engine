/**
 * @jest-environment jsdom
 */
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import { ThemeVariables, themeVar } from "../src/theme/variables";
import type { Selection, SelectionSource } from "../src/types/selection";
import type { Song } from "../src/types/song";
import type { Track } from "../src/types/track";
import { makeBeat, makeMeasureFromVoices, makeNote } from "./fixtures";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function makeTimedSong(): Song {
  const measure = makeMeasureFromVoices([
    [makeBeat({ notes: [makeNote({ string: 1, value: 3 })] })],
  ]);
  (measure as unknown as { time_signature: unknown }).time_signature = {
    numerator: 4,
    denominator: { value: 4 },
  };
  const track = {
    name: "Track",
    strings: Array.from({ length: 6 }, (_, index) => [index, 0]),
    measures: [measure],
  } as unknown as Track;

  return {
    name: "Song",
    tempo: 120,
    measure_headers: [],
    tracks: [track],
  } as unknown as Song;
}

function source(selections: Selection[]): SelectionSource {
  return { getSelections: () => selections };
}

function renderWithSelections(selections: Selection[]): SVGSVGElement {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  const svg = document.querySelector("#tabs") as SVGSVGElement;
  new TabsRenderer(makeTimedSong(), {
    selections: source(selections),
  }).generateMeasures();
  return svg;
}

describe("TabsRenderer selection overlay", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("draws no selection layer when there are no selections", () => {
    expect(renderWithSelections([]).querySelector(".selections")).toBeNull();
  });

  it("renders a region rect for a selection over the tab", () => {
    const svg = renderWithSelections([
      { id: "a", songId: "song", startMs: 0, endMs: 1000 },
    ]);

    const region = svg.querySelector(".selection-region");
    expect(region).not.toBeNull();
    expect(Number(region?.getAttribute("width"))).toBeGreaterThan(0);
    expect(region?.getAttribute("fill-opacity")).toBe(
      themeVar(ThemeVariables.SELECTION_OPACITY),
    );
  });

  it("keeps the overlay non-interactive so notes stay clickable", () => {
    const svg = renderWithSelections([
      { id: "a", songId: "song", startMs: 0, endMs: 1000 },
    ]);

    expect(
      svg.querySelector(".selections")?.getAttribute("pointer-events"),
    ).toBe("none");
  });

  it("uses the selection's own color when provided", () => {
    const svg = renderWithSelections([
      { id: "a", songId: "song", startMs: 0, endMs: 1000, color: "#ff0000" },
    ]);

    expect(svg.querySelector(".selection-region")?.getAttribute("fill")).toBe(
      "#ff0000",
    );
  });

  it("falls back to the theme selection color", () => {
    const svg = renderWithSelections([
      { id: "a", songId: "song", startMs: 0, endMs: 1000 },
    ]);

    expect(svg.querySelector(".selection-region")?.getAttribute("fill")).toBe(
      themeVar(ThemeVariables.COLOR_SELECTION),
    );
  });

  it("renders the selection label as plain text", () => {
    const svg = renderWithSelections([
      { id: "a", songId: "song", startMs: 0, endMs: 1000, label: "chorus" },
    ]);

    expect(svg.querySelector(".selection-label")?.textContent).toBe("chorus");
  });

  it("renders overlapping selections as separate layers", () => {
    const svg = renderWithSelections([
      { id: "a", songId: "song", startMs: 0, endMs: 1500 },
      { id: "b", songId: "song", startMs: 500, endMs: 2000 },
    ]);

    expect(svg.querySelectorAll(".selection")).toHaveLength(2);
  });

  it("draws the draft selection with a distinct dashed style", () => {
    document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
    const svg = document.querySelector("#tabs") as SVGSVGElement;
    const draft: Selection = {
      id: "draft",
      songId: "song",
      startMs: 0,
      endMs: 1000,
    };
    new TabsRenderer(makeTimedSong(), {
      selections: { getSelections: () => [], getDraftSelection: () => draft },
    }).generateMeasures();

    const draftGroup = svg.querySelector(".selection-draft");
    expect(draftGroup).not.toBeNull();
    expect(
      draftGroup?.querySelector(".selection-region")?.getAttribute(
        "stroke-dasharray",
      ),
    ).toBe("4 3");
  });
});
