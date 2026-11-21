import type { MeasureContext } from "../../types/UI/measureContext";
import type { TabLayout } from "../../types/UI/tabLayout";
import type { MeasureTiming, SongTimeline } from "../timing/measureTimeline";

export function buildVisualTimeline(
  layout: TabLayout,
  measures: readonly MeasureContext[],
  timeline: SongTimeline,
): SongTimeline {
  const timings: MeasureTiming[] = [];
  layout.measureLayouts.forEach(({ measurePosition, fragment }, index) => {
    const measure = measures[measurePosition ?? index];
    const timing = measure && timeline.measures[measure.index];
    if (!timing) {
      return;
    }
    if (!fragment) {
      timings[index] = { ...timing, index };
      return;
    }
    const startMs = timing.startMs + fragment.start * timing.durationMs;
    const endMs = fragment.last
      ? timing.endMs
      : timing.startMs + fragment.end * timing.durationMs;
    timings[index] = {
      ...timing,
      index,
      startMs,
      endMs,
      durationMs: endMs - startMs,
    };
  });
  return { ...timeline, measures: timings };
}
