import { SnapMode, snapTime } from "../src/utils/timing/snapTime";
import type { SongTimeline } from "../src/utils/timing/measureTimeline";

function makeTimeline(): SongTimeline {
  return {
    durationMs: 4000,
    measures: [
      {
        index: 0,
        startMs: 0,
        endMs: 2000,
        durationMs: 2000,
        beatCount: 4,
        beatDurationMs: 500,
      },
      {
        index: 1,
        startMs: 2000,
        endMs: 4000,
        durationMs: 2000,
        beatCount: 4,
        beatDurationMs: 500,
      },
    ],
  };
}

describe("snapTime", () => {
  const timeline = makeTimeline();

  it("returns the time unchanged for None", () => {
    expect(snapTime(1234, SnapMode.None, timeline)).toBe(1234);
  });

  it("snaps to the nearest beat", () => {
    expect(snapTime(700, SnapMode.Beat, timeline)).toBe(500);
    expect(snapTime(800, SnapMode.Beat, timeline)).toBe(1000);
    expect(snapTime(2600, SnapMode.Beat, timeline)).toBe(2500);
  });

  it("clamps a beat snap to the measure end", () => {
    expect(snapTime(1900, SnapMode.Beat, timeline)).toBe(2000);
  });

  it("snaps to the nearest measure boundary", () => {
    expect(snapTime(700, SnapMode.Measure, timeline)).toBe(0);
    expect(snapTime(1500, SnapMode.Measure, timeline)).toBe(2000);
    expect(snapTime(3600, SnapMode.Measure, timeline)).toBe(4000);
  });

  it("clamps out-of-range times to the song bounds", () => {
    expect(snapTime(-500, SnapMode.Beat, timeline)).toBe(0);
    expect(snapTime(9999, SnapMode.Beat, timeline)).toBe(4000);
  });
});
