import type { Theme, ThemeInput } from "./theme";
import { defineTheme } from "./theme";
import type { PresetTheme } from "./presets";
import { isPresetTheme, resolvePreset } from "./presets";

/** Every shape the theme APIs accept. */
export type ThemeLike = Theme | ThemeInput | PresetTheme;

const EMPTY_THEME: Theme = { variables: {} };

/**
 * Normalises any accepted theme shape to a {@link Theme}: a preset name looks
 * up the registry (an unknown name degrades to the unthemed fallbacks rather
 * than throwing), an already-built theme passes through, and a plain
 * {@link ThemeInput} is run through {@link defineTheme}.
 */
export function coerceTheme(value: ThemeLike | undefined): Theme {
  if (!value) {
    return EMPTY_THEME;
  }
  if (typeof value === "string") {
    return isPresetTheme(value) ? resolvePreset(value) : EMPTY_THEME;
  }
  if ("variables" in value) {
    return value;
  }
  return defineTheme(value);
}
