import type { Measure } from "../types/measure";
import type { BeatLayout } from "../types/UI/noteLayout";
import type { MeasureLayout } from "../types/UI/tabLayout";
import { voiceBeatSpans } from "../utils/timing/beatTimeline";
import type { MeasureTiming } from "../utils/timing/measureTimeline";
import type { TimeAnchor } from "./measureTimeMap";
import { linearAnchors } from "./measureTimeMap";

export type BeatAnchorInput = {
  measure: Measure;
  timing: MeasureTiming;
  layout: MeasureLayout;
  beatLayouts: readonly BeatLayout[];
  nextStartX?: number;
};

export function buildBeatAnchors(input: BeatAnchorInput): TimeAnchor[] {
  const { measure, timing, layout, beatLayouts } = input;
  const spans = voiceBeatSpans(measure, timing);
  const beatAnchors = beatLayouts
    .flatMap((beat) => {
      const span = spans[beat.voiceIndex]?.[beat.beatIndex];
      return span ? [{ ms: span.startMs, x: beat.x }] : [];
    })
    .sort((a, b) => a.ms - b.ms || a.x - b.x);

  if (beatAnchors.length === 0) {
    return linearAnchors(timing, layout);
  }

  const anchors: TimeAnchor[] = [];
  for (const anchor of beatAnchors) {
    const previous = anchors[anchors.length - 1];
    if (previous && (anchor.ms <= previous.ms || anchor.x < previous.x)) {
      continue;
    }
    anchors.push(anchor);
  }

  if (anchors[0].ms > timing.startMs) {
    anchors.unshift({ ms: timing.startMs, x: anchors[0].x });
  }

  const lastX = anchors[anchors.length - 1].x;
  const endX = input.nextStartX ?? layout.x + layout.width;
  anchors.push({ ms: timing.endMs, x: Math.max(lastX, endX) });
  return anchors;
}

export function firstBeatX(
  measure: Measure,
  timing: MeasureTiming,
  beatLayouts: readonly BeatLayout[],
): number | undefined {
  const spans = voiceBeatSpans(measure, timing);
  let first: { ms: number; x: number } | undefined;
  for (const beat of beatLayouts) {
    const span = spans[beat.voiceIndex]?.[beat.beatIndex];
    if (!span) {
      continue;
    }
    if (
      !first ||
      span.startMs < first.ms ||
      (span.startMs === first.ms && beat.x < first.x)
    ) {
      first = { ms: span.startMs, x: beat.x };
    }
  }
  return first?.x;
}
