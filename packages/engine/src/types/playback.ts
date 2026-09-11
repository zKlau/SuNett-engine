import type { SelectionEventMap } from "./selection";

/** Whether the transport is advancing, held, or reset to the start. */
export const PlaybackState = {
  Playing: "playing",
  Paused: "paused",
  Stopped: "stopped",
} as const;

/** One of `"playing" | "paused" | "stopped"`. */
export type PlaybackState = (typeof PlaybackState)[keyof typeof PlaybackState];

/** A time range, in milliseconds, the transport loops over while playing. */
export type LoopRange = {
  startMs: number;
  endMs: number;
};

/** Payload carried by every playback event: the current transport time. */
export type PlaybackPositionEvent = {
  /** Current position in milliseconds from the song's beginning. */
  positionMs: number;
};

/** Payloads emitted for each playback lifecycle event. */
export type PlaybackEventMap = {
  playbackStarted: PlaybackPositionEvent;
  playbackPaused: PlaybackPositionEvent;
  playbackStopped: PlaybackPositionEvent;
  playbackPositionChanged: PlaybackPositionEvent;
};

/** Every event the engine surfaces: selection and playback lifecycles. */
export type EngineEventMap = SelectionEventMap & PlaybackEventMap;
