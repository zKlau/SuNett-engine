/**
 * @jest-environment jsdom
 */
import type { Song } from "../src/types/song";
import type { Track } from "../src/types/track";
import {
  noteStringIndex,
  noteStringOffset,
  openStringPitch,
} from "../src/utils/song/stringIndex";
import { TabsRenderer } from "../src/utils/tabs/tabsRenderer";
import { makeBeat, makeMeasureFromVoices, makeNote } from "./fixtures";

const HIGH_FIRST: [number, number][] = [
  [1, 64],
  [2, 59],
  [3, 55],
  [4, 50],
  [5, 45],
  [6, 40],
];

const LOW_FIRST: [number, number][] = [
  [1, 40],
  [2, 45],
  [3, 50],
  [4, 55],
  [5, 59],
  [6, 64],
];

function song(major: number, track: Track): Song {
  return {
    name: "Song",
    version: { data: "", clipboard: false, number: [major, 0, 0] },
    measure_headers: [],
    tracks: [track],
  } as unknown as Song;
}

function track(strings: [number, number][], noteStrings: number[] = []) {
  return {
    name: "Track",
    strings,
    measures: [
      makeMeasureFromVoices([
        [
          makeBeat({
            notes: noteStrings.map((string, index) =>
              makeNote({ string, value: index + 1 }),
            ),
          }),
        ],
      ]),
    ],
  } as unknown as Track;
}

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe("note string resolution", () => {
  it("treats Guitar Pro 5 strings as the 1-based tuning pair numbers", () => {
    const gp5 = track(HIGH_FIRST);
    const value = song(5, gp5);

    expect(noteStringOffset(value, gp5)).toBe(1);
    expect(noteStringIndex(value, gp5, 6)).toBe(5);
    expect(openStringPitch(value, gp5, 1)).toBe(64);
    expect(openStringPitch(value, gp5, 6)).toBe(40);
  });

  it("treats Guitar Pro 7 strings as 0-based indexes in tuning order", () => {
    const gp7 = track(LOW_FIRST);
    const value = song(7, gp7);

    expect(noteStringOffset(value, gp7)).toBe(0);
    expect(openStringPitch(value, gp7, 0)).toBe(40);
    expect(openStringPitch(value, gp7, 3)).toBe(55);
  });

  it("falls back to 0-based strings when the format is unknown", () => {
    const unknown = track(LOW_FIRST);

    expect(noteStringOffset(undefined, unknown)).toBe(0);
    expect(openStringPitch(undefined, unknown, 6)).toBeUndefined();
  });

  it("renders every string of a Guitar Pro 5 track, low E on the bottom line", () => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
    document.body.innerHTML = '<div><svg id="tabs"></svg></div>';
    const svg = document.querySelector("#tabs") as SVGSVGElement;
    const gp5 = track(HIGH_FIRST, [1, 6]);

    new TabsRenderer(song(5, gp5)).generateMeasures();

    const measure = svg.querySelector(".measure")!;
    const lineYs = Array.from(measure.querySelectorAll(".string"))
      .map((line) => Number(line.getAttribute("d")!.split(" ")[2]))
      .sort((a, b) => a - b);
    const rowOfString = (string: string) => {
      const note = measure.querySelector(`g.tab-note[data-string="${string}"]`);
      return note ? lineYs.indexOf(Number(note.getAttribute("y"))) : -1;
    };

    expect(rowOfString("1")).toBe(0);
    expect(rowOfString("6")).toBe(5);
  });
});
