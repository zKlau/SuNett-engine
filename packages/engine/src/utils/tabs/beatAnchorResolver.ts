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
  const beatLayoutCache = new Map<number, BeatLayout[]>();
  const anchorCache = new Map<number, TimeAnchor[] | undefined>();

  function beatLayoutsAt(position: number): BeatLayout[] {
    const cached = beatLayoutCache.get(position);
    if (cached) {
      return cached;
    }
    const measureLayout = input.layout.measureLayouts[position];
    const measureContext =
      input.measures[measureLayout?.measurePosition ?? position];
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
            !measureLayout.fragment?.part &&
              shouldRenderTimeSignature(
                measureContext,
                position === 0,
                input.song.measure_headers[measureContext.index - 1],
              ),
            input.sizing,
            measureLayout.fragment,
          )
        : [];
    beatLayoutCache.set(position, beatLayouts);
    return beatLayouts;
  }

  function nextStartX(position: number): number | undefined {
    const layout = input.layout.measureLayouts[position];
    const nextLayout = input.layout.measureLayouts[position + 1];
    const next = input.measures[nextLayout?.measurePosition ?? position + 1];
    const nextTiming = input.timeline.measures[position + 1];
    if (!layout || !nextLayout || nextLayout.row !== layout.row) {
      return undefined;
    }
    if (!next || !nextTiming) {
      return undefined;
    }
    return firstBeatX(next.measure, nextTiming, beatLayoutsAt(position + 1));
  }

  function anchorsAt(position: number): TimeAnchor[] | undefined {
    const layout = input.layout.measureLayouts[position];
    const measureContext = input.measures[layout?.measurePosition ?? position];
    const timing = input.timeline.measures[position];
    if (!measureContext || !layout || !timing) {
      return undefined;
    }
    if (layout.fragment) {
      const fragment = layout.fragment;
      const beats = beatLayoutsAt(position);
      let beatIndex = 0;
      const anchors = fragment.columns.map((column) => {
        const x = beats[beatIndex]?.x ?? layout.x;
        beatIndex += column.beats.length;
        const fraction =
          (column.time - fragment.start) / (fragment.end - fragment.start);
        return { ms: timing.startMs + fraction * timing.durationMs, x };
      });
      anchors.push({ ms: timing.endMs, x: layout.x + layout.width });
      return anchors;
    }
    return buildBeatAnchors({
      measure: measureContext.measure,
      timing,
      layout,
      beatLayouts: beatLayoutsAt(position),
      nextStartX: nextStartX(position),
    });
  }

  return (position) => {
    if (!anchorCache.has(position)) {
      anchorCache.set(position, anchorsAt(position));
    }
    return anchorCache.get(position);
  };
}
