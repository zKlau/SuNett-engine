export const ThemeVariables = {
  COLOR_FG: "--sunett-color-fg",
  COLOR_MUTED: "--sunett-color-muted",
  COLOR_NOTE_FG: "--sunett-color-note-fg",
  COLOR_NOTE_BG: "--sunett-color-note-bg",
  COLOR_BG: "--sunett-color-bg",
  COLOR_STRING: "--sunett-color-string",
  COLOR_BARLINE: "--sunett-color-barline",
  COLOR_ACCENT: "--sunett-color-accent",
  FONT_NOTE: "--sunett-font-note",
  FONT_LABEL: "--sunett-font-label",
  FONT_LABEL_SIZE: "--sunett-font-label-size",
  STRING_OPACITY: "--sunett-string-opacity",
  BARLINE_OPACITY: "--sunett-barline-opacity",
  STRING_WIDTH: "--sunett-string-width",
} as const;

export type ThemeVariable =
  (typeof ThemeVariables)[keyof typeof ThemeVariables];

const ThemeVariableFallbacks: Record<ThemeVariable, string> = {
  [ThemeVariables.COLOR_FG]: "currentColor",
  [ThemeVariables.COLOR_MUTED]:
    "color-mix(in srgb, currentColor 55%, transparent)",
  [ThemeVariables.COLOR_NOTE_FG]: "var(--sunett-color-fg, currentColor)",
  [ThemeVariables.COLOR_NOTE_BG]: "Canvas",
  [ThemeVariables.COLOR_BG]: "transparent",
  [ThemeVariables.COLOR_STRING]: "var(--sunett-color-fg, currentColor)",
  [ThemeVariables.COLOR_BARLINE]: "var(--sunett-color-fg, currentColor)",
  [ThemeVariables.COLOR_ACCENT]: "var(--sunett-color-fg, currentColor)",
  [ThemeVariables.FONT_NOTE]: "ui-monospace, monospace",
  [ThemeVariables.FONT_LABEL]: "system-ui, sans-serif",
  [ThemeVariables.FONT_LABEL_SIZE]: "11px",
  [ThemeVariables.STRING_OPACITY]: "0.68",
  [ThemeVariables.BARLINE_OPACITY]: "0.68",
  [ThemeVariables.STRING_WIDTH]: "1",
};

export function themeVar(variable: ThemeVariable): string {
  return `var(${variable}, ${ThemeVariableFallbacks[variable]})`;
}
