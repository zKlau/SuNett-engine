export { TabsRenderer } from "./utils/tabs/tabsRenderer";
export { SongHelper } from "./utils/songHelper";

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
export type { NoteRenderContext } from "./types/UI/noteRenderContext";

export type { Song } from "./types/song";
export type { Track } from "./types/track";
export type { Measure, MeasureHeader } from "./types/measure";
export type { Voice } from "./types/voice";
export type { Beat } from "./types/beats/beat";
export type { Note } from "./types/note";
