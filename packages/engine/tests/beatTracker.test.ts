import { BeatTracker } from "../src/playback/beatTracker";
import type { BeatTiming } from "../src/utils/timing/beatTimeline";
import { makeBeat } from "./fixtures";

function timing(beatIndex: number, startMs: number, endMs: number) {
  return {
    measureIndex: 0,
    voiceIndex: 0,
    beatIndex,
    startMs,
    endMs,
    beat: makeBeat(),
  } satisfies BeatTiming;
}

function makeTracker() {
  const tracker = new BeatTracker();
  tracker.setTimeline({
    beats: [timing(0, 0, 500), timing(1, 500, 1000)],
    maxBeatDurationMs: 500,
  });
  return tracker;
}

describe("BeatTracker", () => {
  it("emits only when the beats under the position change", () => {
    const tracker = makeTracker();
    const changed = jest.fn();
    tracker.on("beatChanged", changed);

    tracker.update(0);
    tracker.update(100);
    tracker.update(499);
    tracker.update(500);

    expect(changed).toHaveBeenCalledTimes(2);
    expect(changed.mock.calls[1][0].positionMs).toBe(500);
    expect(changed.mock.calls[1][0].beats[0].beatIndex).toBe(1);
    expect(tracker.getCurrentBeats()[0].beatIndex).toBe(1);
  });

  it("emits an empty set past the last beat", () => {
    const tracker = makeTracker();
    const changed = jest.fn();
    tracker.update(100);
    tracker.on("beatChanged", changed);

    tracker.update(2000);

    expect(changed).toHaveBeenCalledWith({ positionMs: 2000, beats: [] });
  });

  it("emits again after the timeline is replaced", () => {
    const tracker = makeTracker();
    const changed = jest.fn();
    tracker.on("beatChanged", changed);

    tracker.update(100);
    tracker.setTimeline(tracker.getTimeline());
    tracker.update(100);

    expect(changed).toHaveBeenCalledTimes(2);
  });
});
