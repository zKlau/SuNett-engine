import {
  linearAnchors,
  measureAnchors,
  timeAtX,
  xAtTime,
} from "../src/playback/measureTimeMap";

const timing = {
  index: 0,
  startMs: 0,
  endMs: 1000,
  durationMs: 1000,
  beatCount: 4,
  beatDurationMs: 250,
};
const layout = { x: 100, y: 0, width: 200, row: 0 };
const anchors = [
  { ms: 0, x: 130 },
  { ms: 500, x: 190 },
  { ms: 1000, x: 300 },
];

describe("xAtTime", () => {
  it("lands exactly on an anchor at its time", () => {
    expect(xAtTime(anchors, 500)).toBe(190);
  });

  it("interpolates between the anchors around a time", () => {
    expect(xAtTime(anchors, 250)).toBe(160);
    expect(xAtTime(anchors, 750)).toBe(245);
  });

  it("holds at the first and last anchors outside their range", () => {
    expect(xAtTime(anchors, -50)).toBe(130);
    expect(xAtTime(anchors, 4000)).toBe(300);
  });

  it("returns undefined without anchors", () => {
    expect(xAtTime([], 100)).toBeUndefined();
  });
});

describe("timeAtX", () => {
  it("inverts xAtTime", () => {
    expect(timeAtX(anchors, 160)).toBe(250);
    expect(timeAtX(anchors, 245)).toBe(750);
  });

  it("maps padding before the first beat to the measure start", () => {
    expect(timeAtX(anchors, 105)).toBe(0);
  });
});

describe("measureAnchors", () => {
  it("uses the resolver's anchors when it has them", () => {
    expect(measureAnchors(() => anchors, 0, timing, layout)).toBe(anchors);
  });

  it("spreads time evenly when the resolver has none", () => {
    const expected = linearAnchors(timing, layout);

    expect(measureAnchors(undefined, 0, timing, layout)).toEqual(expected);
    expect(measureAnchors(() => [], 0, timing, layout)).toEqual(expected);
    expect(expected).toEqual([
      { ms: 0, x: 100 },
      { ms: 1000, x: 300 },
    ]);
  });
});
