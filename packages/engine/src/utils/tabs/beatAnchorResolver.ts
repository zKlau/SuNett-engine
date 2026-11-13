import { buildBeatAnchors, firstBeatX } from "../../playback/beatAnchors";
import type {
  TimeAnchor,
  TimeAnchorResolver,
} from "../../playback/measureTimeMap";
import type { Song } from "../../types/song";
import type { MeasureContext } from "../../types/UI/measureContext";
import type { BeatLayout } from "../../types/UI/noteLayout";
import type { NoteMetrics } from "../../types/UI/noteMetrics";
import type { NoteRenderConfig } from "../../types/UI/notesRender";
import type { TabLayout } from "../../types/UI/tabLayout";
import type { SongTimeline } from "../timing/measureTimeline";
import {
  calculateMeasureBeatLayouts,
  shouldRenderTimeSignature,
} from "./measureContentRenderer";

export type BeatAnchorResolverInput = {
  song: Song;
  layout: TabLayout;
  measures: readonly MeasureContext[];
  timeline: SongTimeline;
  sizing: { config: NoteRenderConfig; metrics: NoteMetrics };
};

export function createBeatAnchorResolver(
  input: BeatAnchorResolverInput,
): TimeAnchorResolver {
  const positions = new Map<number, number>();
  input.measures.forEach((measureContext, position) => {
    positions.set(measureContext.index, position);
  });

  const beatLayoutCache = new Map<number, BeatLayout[]>();
  const anchorCache = new Map<number, TimeAnchor[] | undefined>();

  function beatLayoutsAt(position: number): BeatLayout[] {
    const cached = beatLayoutCache.get(position);
    if (cached) {
      return cached;
    }
    const measureContext = input.measures[position];
    const measureLayout = input.layout.measureLayouts[position];
    const beatLayouts =
      measureContext && measureLayout
        ? calculateMeasureBeatLayouts(
            measureContext,
            {
              x: measureLayout.x,
              y: measureLayout.y,
              width: measureLayout.width,
              height: input.layout.measureHeight,
              bottomPadding: input.layout.bottomPadding,
              stringSpacing: input.layout.stringSpacing,
              isLastMeasure: position === input.measures.length - 1,
            },
            shouldRenderTimeSignature(
              measureContext,
              position === 0,
              input.song.measure_headers[measureContext.index - 1],
            ),
            input.sizing,
          )
        : [];
    beatLayoutCache.set(position, beatLayouts);
    return beatLayouts;
  }

  function nextStartX(position: number): number | undefined {
    const layout = input.layout.measureLayouts[position];
    const nextLayout = input.layout.measureLayouts[position + 1];
    const next = input.measures[position + 1];
    const nextTiming = next ? input.timeline.measures[next.index] : undefined;
    if (!layout || !nextLayout || nextLayout.row !== layout.row) {
      return undefined;
    }
    if (!next || !nextTiming) {
      return undefined;
    }
    return firstBeatX(next.measure, nextTiming, beatLayoutsAt(position + 1));
  }

  function anchorsAt(position: number): TimeAnchor[] | undefined {
    const measureContext = input.measures[position];
    const layout = input.layout.measureLayouts[position];
    const timing = measureContext
      ? input.timeline.measures[measureContext.index]
      : undefined;
    if (!measureContext || !layout || !timing) {
      return undefined;
    }
    return buildBeatAnchors({
      measure: measureContext.measure,
      timing,
      layout,
      beatLayouts: beatLayoutsAt(position),
      nextStartX: nextStartX(position),
    });
  }

  return (measureIndex) => {
    const position = positions.get(measureIndex);
    if (position === undefined) {
      return undefined;
    }
    if (!anchorCache.has(position)) {
      anchorCache.set(position, anchorsAt(position));
    }
    return anchorCache.get(position);
  };
}
