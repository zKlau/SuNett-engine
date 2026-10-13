export { TabsRenderer } from "./utils/tabs/tabsRenderer";
export { SongHelper } from "./utils/songHelper";

export { SunettEngine } from "./engine/sunettEngine";
export type { SunettEngineConfig } from "./engine/sunettEngine";
export type {
  SelectionInputOptions,
  SelectionRange,
} from "./engine/selectionInput";
export type { PlaybackInputOptions } from "./engine/playbackInput";
export { FollowAlign } from "./engine/playbackFollow";
export type { AutoScrollOptions } from "./engine/playbackFollow";
export type { NoteRef } from "./engine/noteClasses";
export { SnapMode } from "./utils/timing/snapTime";
export { computeSongHash } from "./utils/song/songHash";
export {
  noteStringIndex,
  noteStringOffset,
  openStringPitch,
} from "./utils/song/stringIndex";
export { Emitter } from "./utils/events/emitter";
export {
  buildSongTimeline,
  measureLengthInWholeNotes,
} from "./utils/timing/measureTimeline";
export type {
  MeasureTiming,
  SongTimeline,
} from "./utils/timing/measureTimeline";
export {
  beatsAt,
  buildBeatTimeline,
  nextBeatStart,
  previousBeatStart,
} from "./utils/timing/beatTimeline";
export type { BeatTiming, BeatTimeline } from "./utils/timing/beatTimeline";
export { durationInWholeNotes } from "./utils/timing/durationLength";
export { BeatTracker } from "./playback/beatTracker";

export { PlaybackController } from "./playback/playbackController";
export type {
  FrameScheduler,
  PlaybackControllerConfig,
} from "./playback/playbackController";
export { PlaybackState } from "./types/playback";
export type {
  LoopRange,
  PlaybackPositionEvent,
  PlaybackEventMap,
  BeatChangedEvent,
  BeatEventMap,
  EngineEventMap,
} from "./types/playback";
export type {
  Selection,
  SelectionInput,
  SelectionUpdate,
  SelectionDraftUpdate,
  SelectionStore,
  SelectionEventMap,
  SelectionSource,
} from "./types/selection";

export { defineTheme, mergeThemes } from "./theme/theme";
export { coerceTheme } from "./theme/resolveTheme";
export { ThemePresets } from "./theme/presets";
export { ThemeVariables } from "./theme/variables";

export type {
  Theme,
  ThemeInput,
  ThemeColors,
  ThemeFonts,
  ThemeOpacity,
  ThemeLines,
  ThemeSizing,
} from "./theme/theme";
export type { ThemeLike } from "./theme/resolveTheme";
export type { PresetTheme } from "./theme/presets";
export type { ThemeVariable } from "./theme/variables";
export type {
  TabRendererOptions,
  TabsRendererConfig,
} from "./types/UI/rendererOptions";
export type { TabNoteOptions } from "./types/UI/tabNoteOptions";
export type { CursorOptions, CursorSvgFactory } from "./types/UI/cursorOptions";
export type { NoteRenderContext } from "./types/UI/noteRenderContext";

export type { Song } from "./types/song";
export type { Track } from "./types/track";
export type { Measure, MeasureHeader } from "./types/measure";
export type { Voice } from "./types/voice";
export type { Beat } from "./types/beats/beat";
export type { Note } from "./types/note";

export { compileSynthScore, durationInQuarters } from "./audio/songScore";
export type { SynthScore, SynthNote } from "./audio/songScore";
export { resolveTrackProgram } from "./audio/trackInstrument";
export type { Duration, TimeSignature } from "./types/duration";
export type { Chord } from "./types/chords/chord";
