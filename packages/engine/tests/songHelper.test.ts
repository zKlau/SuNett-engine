import { SongHelper } from "../src/utils/songHelper";
import { makeMeasure, makeSong, makeTrack } from "./fixtures";

describe("SongHelper", () => {
  const trackA = makeTrack(6, [makeMeasure(2), makeMeasure(1)], "Guitar");
  const trackB = makeTrack(4, [makeMeasure(3)], "Bass");
  const song = makeSong([trackA, trackB], "My Song");
  const helper = new SongHelper(song);

  it("exposes the song name", () => {
    expect(helper.name).toBe("My Song");
  });

  it("exposes all tracks", () => {
    expect(helper.tracks).toHaveLength(2);
    expect(helper.tracks[0]).toBe(trackA);
  });

  it("getTrack returns the track at an index and undefined when out of range", () => {
    expect(helper.getTrack(0)).toBe(trackA);
    expect(helper.getTrack(1)).toBe(trackB);
    expect(helper.getTrack(5)).toBeUndefined();
  });

  it("getTrackName reads a track's name", () => {
    expect(helper.getTrackName(trackB)).toBe("Bass");
  });

  it("getMeaseures maps each track index to its measures", () => {
    const measures = helper.getMeaseures();

    expect(measures.get(0)).toBe(trackA.measures);
    expect(measures.get(0)).toHaveLength(2);
    expect(measures.get(1)).toHaveLength(1);
  });
});
