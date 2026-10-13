import type { Theme } from "../theme";
import { darkTheme } from "./dark";
import { defaultTheme } from "./default";
import { highContrastTheme } from "./highContrast";

/** Registry of themes addressable by name from `TabRendererOptions.theme`. */
export const ThemePresets = {
  default: defaultTheme,
  dark: darkTheme,
  "high-contrast": highContrastTheme,
} as const satisfies Record<string, Theme>;

/** Name of a built-in theme. */
export type PresetTheme = keyof typeof ThemePresets;

export function isPresetTheme(value: unknown): value is PresetTheme {
  return typeof value === "string" && value in ThemePresets;
}

export function resolvePreset(name: PresetTheme): Theme {
  return ThemePresets[name];
}
