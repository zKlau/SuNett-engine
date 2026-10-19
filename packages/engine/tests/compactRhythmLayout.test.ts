/**
 * @jest-environment jsdom
 */
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import type { TabRendererOptions } from "../src/types/UI/rendererOptions";
import {
  makeBeat,
  makeDuration,
  makeMeasureFromVoices,
  makeNote,
  makeSong,
  makeTrack,
} from "./fixtures";

const compact: TabRendererOptions = {
  virtualize: false,
  measuresPerRow: 1,
  stringSpacing: 16,
  rhythmStemLength: 24,
  measureBottomPadding: 56,
  rowGap: 8,
  notes: { fontSize: 13 },
};

class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
}

function setupSvg(): SVGSVGElement {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  return document.querySelector("#tabs") as SVGSVGElement;
}

function quarterMeasure() {
  return makeMeasureFromVoices([
    [makeBeat({ notes: [makeNote({ value: 10 })] })],
  ]);
}

describe("compact rhythm layout", () => {
  beforeAll(() => {
    globalThis.ResizeObserver =
      ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  it("shortens stems and row spacing without changing barline or cursor height", () => {
    const svg = setupSvg();
    const song = makeSong([makeTrack(6, [quarterMeasure(), quarterMeasure()])]);
    const renderer = new TabsRenderer(song);
    renderer.generateMeasures(0, compact);
    const measures = svg.querySelectorAll(".measure");
    const compactStride =
      Number(measures[1].getAttribute("y")) -
      Number(measures[0].getAttribute("y"));
    const stem = measures[0]
      .querySelector(".rhythm-stem")!
      .getAttribute("d")!
      .split(" ");
    expect(Number(stem[4]) - Number(stem[2])).toBe(16);
    const strings = measures[0].querySelectorAll(".string");
    const bottomStringY = Number(strings[5].getAttribute("d")!.split(" ")[2]);
    const barline = measures[0]
      .querySelector(".barline-end")!
      .getAttribute("d")!
      .split(" ");
    expect(Number(barline[4])).toBe(bottomStringY);
    renderer.setCursor(100);
    expect(renderer.getCursorGeometry()!.height).toBe(80);
    renderer.generateMeasures(0, {
      ...compact,
      rhythmStemLength: 42,
      measureBottomPadding: 110,
    });
    const original = svg.querySelectorAll(".measure");
    const originalStride =
      Number(original[1].getAttribute("y")) -
      Number(original[0].getAttribute("y"));
    expect(compactStride).toBeLessThan(originalStride - 40);
    renderer.dispose();
  });

  it("keeps triplet brackets clear of a bend above the next row", () => {
    const svg = setupSvg();
    const triplets = makeMeasureFromVoices([
      Array.from({ length: 3 }, () =>
        makeBeat({
          notes: [makeNote({ value: 8 })],
          duration: makeDuration({
            value: 16,
            tuplet_enters: 3,
            tuplet_times: 2,
          }),
        }),
      ),
    ]);
    const bend = quarterMeasure();
    bend.voices[0].beats[0].notes[0].effect.bend = {
      kind: "Bend",
      value: 8,
      semitone_length: 1,
      max_position: 12,
      max_value: 12,
      points: [
        { position: 0, value: 0, vibrato: false },
        { position: 12, value: 4, vibrato: false },
      ],
    };
    const renderer = new TabsRenderer(
      makeSong([makeTrack(6, [triplets, bend])]),
    );
    renderer.generateMeasures(0, compact);
    const measures = svg.querySelectorAll(".measure");
    const tuplet = measures[0].querySelector(".rhythm-tuplet-number")!;
    const bendLabel = measures[1].querySelector('[data-effect="bend"] text')!;
    const tupletBottom =
      Number(tuplet.getAttribute("y")) +
      Number(tuplet.getAttribute("font-size")) / 2;
    const bendTop =
      Number(bendLabel.getAttribute("y")) -
      Number(bendLabel.getAttribute("font-size")) / 2;
    expect(bendTop - tupletBottom).toBeGreaterThanOrEqual(8);
    renderer.dispose();
  });

  it("expands a compact footer for multiple lyric lines, including the final row", () => {
    const svg = setupSvg();
    const song = makeSong([makeTrack(6, [quarterMeasure(), quarterMeasure()])]);
    song.lyrics = {
      track_choice: 1,
      lines: [
        [0, 1, "one two"],
        [4, 1, "five six"],
      ],
    };
    const renderer = new TabsRenderer(song);
    renderer.generateMeasures(0, compact);
    const lyrics = [...svg.querySelectorAll('.lyric[data-line-index="4"]')];
    expect(lyrics).toHaveLength(2);
    lyrics.forEach((lyric) => {
      expect(Number(lyric.getAttribute("y")) + 6).toBeLessThan(
        Number(svg.getAttribute("height")),
      );
    });
    renderer.dispose();
  });
});
