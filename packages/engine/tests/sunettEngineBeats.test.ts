/**
 * @jest-environment jsdom
 */
import { SunettEngine } from "../src/engine/sunettEngine";
import type { Song } from "../src/types/song";
import {
  makeBeat,
  makeDuration,
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

function measure(): Measure {
  const beats = [0, 1, 2, 3].map((fret) =>
    makeBeat({
      duration: makeDuration({ value: 4 }),
      notes: [makeNote({ value: fret, string: 1 })],
    }),
  );
  return {
    number: 1,
    time_signature: { numerator: 4, denominator: { value: 4 } },
    voices: [{ beats }],
  } as unknown as Measure;
}

function song(): Song {
  const value = makeSong([makeTrack(6, [measure(), measure()])]);
  return { ...value, tempo: 120 } as Song;
}

async function renderedEngine() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  document.body.append(svg);
  const engine = new SunettEngine();
  await engine.loadSong(song());
  engine.render(0, { target: svg, virtualize: false });
  return { engine, svg };
}

describe("SunettEngine beats", () => {
  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("exposes the beat timeline of the rendered track", async () => {
    const { engine } = await renderedEngine();

    expect(engine.getBeatTimeline()).toHaveLength(8);
    expect(engine.getBeatsAt(1600)[0]).toMatchObject({
      measureIndex: 0,
      beatIndex: 3,
      startMs: 1500,
    });
    expect(engine.getNextBeatTime(1600)).toBe(2000);
    expect(engine.getPreviousBeatTime(1600)).toBe(1500);
  });

  it("emits beatChanged when a seek lands on a new beat", async () => {
    const { engine } = await renderedEngine();
    const changed = jest.fn();
    engine.on("beatChanged", changed);

    engine.seek(100);
    engine.seek(600);

    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0].beats[0].beatIndex).toBe(1);
    expect(engine.getCurrentBeats()[0].beatIndex).toBe(1);
  });

  it("applies note classes to rendered notes and keeps them on rerender", async () => {
    const { engine, svg } = await renderedEngine();
    const ref = { measureIndex: 0, voiceIndex: 0, beatIndex: 2, string: 1 };

    engine.setNoteClasses(ref, ["practice-target"]);
    expect(svg.querySelectorAll(".practice-target")).toHaveLength(1);

    engine.rerender();
    expect(svg.querySelectorAll(".practice-target")).toHaveLength(1);

    engine.clearNoteClasses();
    expect(svg.querySelectorAll(".practice-target")).toHaveLength(0);
  });

  it("changes the playback rate", async () => {
    const { engine } = await renderedEngine();

    engine.setPlaybackRate(0.75);

    expect(engine.getPlaybackRate()).toBe(0.75);
  });
});
