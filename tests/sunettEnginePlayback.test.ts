import { SunettEngine } from "../src/engine/sunettEngine";
import { makeMeasure, makeSong, makeTrack } from "./fixtures";

function song() {
  return makeSong([makeTrack(6, [makeMeasure(4), makeMeasure(4)])], "A");
}

async function loadedEngine() {
  const engine = new SunettEngine();
  await engine.loadSong(song());
  return engine;
}

describe("SunettEngine playback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("starts stopped at position zero", async () => {
    const engine = await loadedEngine();

    expect(engine.getPlaybackState()).toBe("stopped");
    expect(engine.getCurrentPosition()).toBe(0);
  });

  it("transitions through play, pause, and stop and fires each event", async () => {
    const engine = await loadedEngine();
    const started = jest.fn();
    const paused = jest.fn();
    const stopped = jest.fn();
    engine.on("playbackStarted", started);
    engine.on("playbackPaused", paused);
    engine.on("playbackStopped", stopped);

    engine.play();
    expect(engine.getPlaybackState()).toBe("playing");
    engine.pause();
    expect(engine.getPlaybackState()).toBe("paused");
    engine.stop();
    expect(engine.getPlaybackState()).toBe("stopped");

    expect(started).toHaveBeenCalledTimes(1);
    expect(paused).toHaveBeenCalledTimes(1);
    expect(stopped).toHaveBeenCalledTimes(1);
  });

  it("treats play while already playing as a no-op", async () => {
    const engine = await loadedEngine();
    const started = jest.fn();
    engine.on("playbackStarted", started);

    engine.play();
    engine.play();

    expect(started).toHaveBeenCalledTimes(1);
  });

  it("seeks to a position and fires playbackPositionChanged", async () => {
    const engine = await loadedEngine();
    const changed = jest.fn();
    engine.on("playbackPositionChanged", changed);

    engine.seek(1234);

    expect(engine.getCurrentPosition()).toBe(1234);
    expect(changed).toHaveBeenCalledWith({ positionMs: 1234 });
  });

  it("continues playing after a mid-playback seek", async () => {
    const engine = await loadedEngine();

    engine.play();
    engine.seek(500);

    expect(engine.getPlaybackState()).toBe("playing");
    expect(engine.getCurrentPosition()).toBe(500);
  });

  it("resets to the loop start on stop when a loop is set", async () => {
    const engine = await loadedEngine();

    engine.setLoop({ startMs: 1000, endMs: 2000 });
    engine.stop();

    expect(engine.getLoop()).toEqual({ startMs: 1000, endMs: 2000 });
    expect(engine.getCurrentPosition()).toBe(1000);
  });

  it("clears the loop and resets to the song start", async () => {
    const engine = await loadedEngine();
    engine.setLoop({ startMs: 1000, endMs: 2000 });

    engine.setLoop(null);
    engine.stop();

    expect(engine.getLoop()).toBeUndefined();
    expect(engine.getCurrentPosition()).toBe(0);
  });

  it("stops removing a listener once off is called", async () => {
    const engine = await loadedEngine();
    const started = jest.fn();
    engine.on("playbackStarted", started);
    engine.off("playbackStarted", started);

    engine.play();

    expect(started).not.toHaveBeenCalled();
  });

  it("resets playback when a new song is loaded", async () => {
    const engine = await loadedEngine();
    engine.seek(1500);
    engine.play();

    await engine.loadSong(song());

    expect(engine.getPlaybackState()).toBe("stopped");
    expect(engine.getCurrentPosition()).toBe(0);
  });
});
