/**
 * @jest-environment jsdom
 */
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import { buildSongTimeline } from "../src/utils/timing/measureTimeline";
import {
  makeBeat,
  makeDuration,
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

function measureWithBeats(frets: number[], durationValue = 4): Measure {
  return makeMeasureFromVoices([
    frets.map((value) =>
      makeBeat({
        duration: makeDuration({ value: durationValue }),
        notes: [makeNote({ string: 1, value })],
      }),
    ),
  ]);
}

function cursorX(): number {
  const cursor = document.querySelector(".playback-cursor") as SVGGElement;
  const match = cursor.style.transform.match(/translate\(\s*(-?[\d.]+)/);
  return match ? Number(match[1]) : NaN;
}

function noteX(measureIndex: number, beatIndex: number): number {
  const note = document.querySelector(
    `[data-measure-index="${measureIndex}"][data-beat-index="${beatIndex}"]`,
  );
  return Number(note?.getAttribute("x"));
}

function renderSong(measures: Measure[]) {
  document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
  const song = makeSong([makeTrack(6, measures)]);
  const renderer = new TabsRenderer(song);
  renderer.generateMeasures();
  const timeline = buildSongTimeline(song, song.tracks[0]);
  return { renderer, timeline };
}

describe("beat-aligned playback cursor", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  it("sits on each note at the moment its beat starts", () => {
    const { renderer, timeline } = renderSong([
      measureWithBeats([0, 12, 3, 10]),
      measureWithBeats([5, 7, 8, 9]),
    ]);

    timeline.measures.forEach((measure, measureIndex) => {
      for (let beatIndex = 0; beatIndex < 4; beatIndex += 1) {
        renderer.setCursor(
          measure.startMs + beatIndex * measure.beatDurationMs,
        );

        expect(cursorX()).toBeCloseTo(noteX(measureIndex, beatIndex), 5);
      }
    });
  });

  it("never reaches a note before its beat starts", () => {
    const { renderer, timeline } = renderSong([
      measureWithBeats([1, 2, 3, 4, 5, 6, 7, 8], 8),
    ]);
    const measure = timeline.measures[0];
    const eighthMs = measure.durationMs / 8;

    for (let beatIndex = 1; beatIndex < 8; beatIndex += 1) {
      renderer.setCursor(measure.startMs + beatIndex * eighthMs - 1);

      expect(cursorX()).toBeLessThan(noteX(0, beatIndex));
    }
  });

  it("moves continuously into the next measure's first note", () => {
    const { renderer, timeline } = renderSong([
      measureWithBeats([0]),
      measureWithBeats([3]),
    ]);
    const boundary = timeline.measures[1].startMs;

    renderer.setCursor(boundary - 0.001);
    const before = cursorX();
    renderer.setCursor(boundary);

    expect(cursorX()).toBeCloseTo(noteX(1, 0), 5);
    expect(cursorX() - before).toBeLessThan(0.1);
  });

  it("keeps the original beat and selection timing across wrapped rows", () => {
    document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
    const svg = document.querySelector("#tabs") as SVGSVGElement;
    Object.defineProperty(svg.parentElement, "clientWidth", { value: 374 });
    const dense = measureWithBeats(
      Array.from({ length: 32 }, () => 12),
      32,
    );
    dense.time_signature = {
      numerator: 4,
      denominator: makeDuration({ value: 4 }),
      beams: [],
    };
    const next = measureWithBeats([3]);
    const song = makeSong([makeTrack(6, [dense, next])]);
    const {
      measures: [first, second],
    } = buildSongTimeline(song, song.tracks[0]);
    const renderer = new TabsRenderer(song, {
      selections: {
        getSelections: () => [
          {
            id: "selection",
            songId: "song",
            startMs: first.startMs,
            endMs: first.endMs,
          },
        ],
      },
    });
    renderer.generateMeasures(0, { wrapMeasures: true, virtualize: false });

    const fragments = svg.querySelectorAll('[measure-index="0"]');
    expect(fragments.length).toBeGreaterThan(1);
    const labels = svg.querySelectorAll('[measure-index="0"] .measure-index');
    expect(Array.from(labels, (label) => label.textContent)).toEqual(["1"]);
    expect(svg.querySelectorAll(".selection-region")).toHaveLength(
      fragments.length,
    );
    expect(svg.querySelectorAll('[data-measure-index="0"]')).toHaveLength(32);
    expect(svg.querySelectorAll(".time-signature")).toHaveLength(1);

    for (let beatIndex = 0; beatIndex < 32; beatIndex += 1) {
      const note = svg.querySelector(
        `[data-measure-index="0"][data-beat-index="${beatIndex}"]`,
      );
      renderer.setCursor(first.startMs + (beatIndex * first.durationMs) / 32);
      expect(cursorX()).toBeCloseTo(noteX(0, beatIndex), 5);
      expect(renderer.getCursorGeometry()?.rowTop).toBe(
        Number(note?.closest(".measure")?.getAttribute("y")),
      );
    }

    renderer.setCursor(second.startMs);
    expect(cursorX()).toBeCloseTo(noteX(1, 0), 5);
    expect(renderer.snapTime(first.durationMs / 3, "Measure")).toBe(
      first.startMs,
    );
    renderer.dispose();
  });
});
