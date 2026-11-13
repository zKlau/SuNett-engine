import type { MeasureLayout } from "../types/UI/tabLayout";
import type { MeasureTiming } from "../utils/timing/measureTimeline";

export type TimeAnchor = {
  ms: number;
  x: number;
};

export type TimeAnchorResolver = (
  measureIndex: number,
) => readonly TimeAnchor[] | undefined;

export function linearAnchors(
  timing: MeasureTiming,
  layout: MeasureLayout,
): TimeAnchor[] {
  return [
    { ms: timing.startMs, x: layout.x },
    { ms: timing.endMs, x: layout.x + layout.width },
  ];
}

export function measureAnchors(
  resolver: TimeAnchorResolver | undefined,
  measureIndex: number,
  timing: MeasureTiming,
  layout: MeasureLayout,
): readonly TimeAnchor[] {
  const resolved = resolver?.(measureIndex);
  return resolved && resolved.length > 0
    ? resolved
    : linearAnchors(timing, layout);
}

export function xAtTime(
  anchors: readonly TimeAnchor[],
  ms: number,
): number | undefined {
  const segment = segmentAround(anchors, (anchor) => anchor.ms, ms);
  if (!segment) {
    return undefined;
  }
  const [from, to] = segment;
  return interpolate(from.ms, to.ms, from.x, to.x, ms);
}

export function timeAtX(
  anchors: readonly TimeAnchor[],
  x: number,
): number | undefined {
  const segment = segmentAround(anchors, (anchor) => anchor.x, x);
  if (!segment) {
    return undefined;
  }
  const [from, to] = segment;
  return interpolate(from.x, to.x, from.ms, to.ms, x);
}

function segmentAround(
  anchors: readonly TimeAnchor[],
  key: (anchor: TimeAnchor) => number,
  value: number,
): [TimeAnchor, TimeAnchor] | undefined {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (!first || !last) {
    return undefined;
  }
  if (value <= key(first)) {
    return [first, first];
  }
  for (let index = 1; index < anchors.length; index += 1) {
    if (value < key(anchors[index])) {
      return [anchors[index - 1], anchors[index]];
    }
  }
  return [last, last];
}

function interpolate(
  fromKey: number,
  toKey: number,
  fromValue: number,
  toValue: number,
  key: number,
): number {
  const span = toKey - fromKey;
  if (span <= 0) {
    return fromValue;
  }
  return fromValue + ((key - fromKey) / span) * (toValue - fromValue);
}
