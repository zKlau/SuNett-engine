import type {
  LoopRange,
  PlaybackEventMap,
  PlaybackState,
} from "../types/playback";
import { PlaybackState as State } from "../types/playback";
import { Emitter } from "../utils/events/emitter";
import { clamp } from "../utils/functions/clamp";

/** Requests and cancels animation frames; injectable so the loop is testable. */
export type FrameScheduler = {
  request(callback: (timeMs: number) => void): number;
  cancel(handle: number): void;
};

export type PlaybackControllerConfig = {
  /** Overrides the default `requestAnimationFrame`-backed scheduler. */
  scheduler?: FrameScheduler;
};

/**
 * Owns the transport clock: play/pause/stop/seek state and a
 * `requestAnimationFrame` loop that advances the position by elapsed wall-clock
 * time. Purely temporal - it knows nothing about the tab or the cursor, and
 * emits position events any consumer can drive a cursor or audio clock from.
 */
export class PlaybackController {
  private readonly emitter = new Emitter<PlaybackEventMap>();
  private readonly scheduler: FrameScheduler;
  private state: PlaybackState = State.Stopped;
  private positionMs = 0;
  private durationMs = 0;
  private loop?: LoopRange;
  private frameHandle?: number;
  private lastFrameMs?: number;

  constructor(config: PlaybackControllerConfig = {}) {
    this.scheduler = config.scheduler ?? defaultScheduler();
  }

  on<Key extends keyof PlaybackEventMap>(
    event: Key,
    listener: (payload: PlaybackEventMap[Key]) => void,
  ): () => void {
    return this.emitter.on(event, listener);
  }

  off<Key extends keyof PlaybackEventMap>(
    event: Key,
    listener: (payload: PlaybackEventMap[Key]) => void,
  ): void {
    this.emitter.off(event, listener);
  }

  getState(): PlaybackState {
    return this.state;
  }

  getPosition(): number {
    return this.positionMs;
  }

  getLoop(): LoopRange | undefined {
    return this.loop;
  }

  /** Sets the song length; the transport pauses on reaching it. */
  setDuration(durationMs: number): void {
    this.durationMs = Math.max(0, durationMs);
    const limited = this.clampToDuration(this.positionMs);
    if (limited !== this.positionMs) {
      this.positionMs = limited;
      this.emitPosition();
    }
  }

  /** Sets or clears the loop range playback wraps within. */
  setLoop(loop: LoopRange | null | undefined): void {
    this.loop = loop ?? undefined;
  }

  /** Starts advancing from the current position. No-op while already playing. */
  play(): void {
    if (this.state === State.Playing) {
      return;
    }
    this.state = State.Playing;
    this.lastFrameMs = undefined;
    this.scheduleFrame();
    this.emitter.emit("playbackStarted", { positionMs: this.positionMs });
  }

  /** Holds the cursor at the current position. No-op unless playing. */
  pause(): void {
    if (this.state !== State.Playing) {
      return;
    }
    this.stopFrame();
    this.state = State.Paused;
    this.emitter.emit("playbackPaused", { positionMs: this.positionMs });
  }

  /** Stops and resets to the loop start, or the song start if no loop is set. */
  stop(): void {
    this.stopFrame();
    this.state = State.Stopped;
    this.positionMs = this.loop?.startMs ?? 0;
    this.emitPosition();
    this.emitter.emit("playbackStopped", { positionMs: this.positionMs });
  }

  /** Moves to `positionMs`; keeps playing when called mid-playback. */
  seek(positionMs: number): void {
    this.positionMs = this.clampToDuration(positionMs);
    this.lastFrameMs = undefined;
    this.emitPosition();
  }

  private scheduleFrame(): void {
    this.frameHandle = this.scheduler.request((timeMs) => this.tick(timeMs));
  }

  private stopFrame(): void {
    if (this.frameHandle !== undefined) {
      this.scheduler.cancel(this.frameHandle);
      this.frameHandle = undefined;
    }
  }

  private tick(timeMs: number): void {
    if (this.state !== State.Playing) {
      return;
    }

    if (this.lastFrameMs === undefined) {
      this.lastFrameMs = timeMs;
      this.scheduleFrame();
      return;
    }

    const delta = timeMs - this.lastFrameMs;
    this.lastFrameMs = timeMs;
    this.advance(delta);

    if (this.state === State.Playing) {
      this.scheduleFrame();
    }
  }

  private advance(deltaMs: number): void {
    const next = this.positionMs + Math.max(0, deltaMs);

    if (this.loop && next >= this.loop.endMs) {
      this.positionMs = wrapIntoLoop(next, this.loop);
      this.emitPosition();
      return;
    }

    if (this.durationMs > 0 && next >= this.durationMs) {
      this.positionMs = this.durationMs;
      this.emitPosition();
      this.pause();
      return;
    }

    this.positionMs = next;
    this.emitPosition();
  }

  private clampToDuration(positionMs: number): number {
    const upper = this.durationMs > 0 ? this.durationMs : positionMs;
    return clamp(positionMs, 0, Math.max(0, upper));
  }

  private emitPosition(): void {
    this.emitter.emit("playbackPositionChanged", {
      positionMs: this.positionMs,
    });
  }
}

function wrapIntoLoop(positionMs: number, loop: LoopRange): number {
  const span = loop.endMs - loop.startMs;
  if (span <= 0) {
    return loop.startMs;
  }
  return loop.startMs + ((positionMs - loop.startMs) % span);
}

function defaultScheduler(): FrameScheduler {
  if (typeof requestAnimationFrame === "function") {
    return {
      request: (callback) => requestAnimationFrame(callback),
      cancel: (handle) => cancelAnimationFrame(handle),
    };
  }

  return {
    request: (callback) =>
      setTimeout(() => callback(Date.now()), 16) as unknown as number,
    cancel: (handle) => clearTimeout(handle),
  };
}
