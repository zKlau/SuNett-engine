import type { BeatEventMap } from "../types/playback";
import type { BeatTimeline, BeatTiming } from "../utils/timing/beatTimeline";
import { beatsAt } from "../utils/timing/beatTimeline";
import { Emitter } from "../utils/events/emitter";

const EMPTY_TIMELINE: BeatTimeline = { beats: [], maxBeatDurationMs: 0 };

/**
 * Follows a song position across a beat timeline and emits `beatChanged`
 * whenever the set of beats under the position changes. Purely temporal - it
 * is fed positions and knows nothing about the transport or the tab.
 */
export class BeatTracker {
  private readonly emitter = new Emitter<BeatEventMap>();
  private timeline: BeatTimeline = EMPTY_TIMELINE;
  private currentKey?: string;
  private currentBeats: BeatTiming[] = [];

  on<Key extends keyof BeatEventMap>(
    event: Key,
    listener: (payload: BeatEventMap[Key]) => void,
  ): () => void {
    return this.emitter.on(event, listener);
  }

  off<Key extends keyof BeatEventMap>(
    event: Key,
    listener: (payload: BeatEventMap[Key]) => void,
  ): void {
    this.emitter.off(event, listener);
  }

  /** Replaces the timeline; the next `update` always emits. */
  setTimeline(timeline: BeatTimeline): void {
    this.timeline = timeline;
    this.currentKey = undefined;
    this.currentBeats = [];
  }

  getTimeline(): BeatTimeline {
    return this.timeline;
  }

  /** The beats under the last position passed to `update`. */
  getCurrentBeats(): BeatTiming[] {
    return this.currentBeats;
  }

  /**
   * Moves to a song position, emitting `beatChanged` if it lands on a
   * different set of beats than the previous position.
   * @param positionMs The song time in milliseconds.
   */
  update(positionMs: number): void {
    const beats = beatsAt(this.timeline, positionMs);
    const key = beats.map(beatKey).join("|");
    if (key === this.currentKey) {
      return;
    }
    this.currentKey = key;
    this.currentBeats = beats;
    this.emitter.emit("beatChanged", { positionMs, beats });
  }
}

function beatKey(timing: BeatTiming): string {
  return `${timing.measureIndex}:${timing.voiceIndex}:${timing.beatIndex}`;
}
