/**
 * The complete set of CSS custom properties the renderer reads. This is the
 * single source of truth: presentation attributes, `defineTheme`, and the
 * shipped stylesheets all derive their names from here.
 */
export const ThemeVariables = {
  COLOR_FG: "--sunett-color-fg",
  COLOR_MUTED: "--sunett-color-muted",
  COLOR_NOTE_FG: "--sunett-color-note-fg",
  COLOR_NOTE_BG: "--sunett-color-note-bg",
  COLOR_STRING: "--sunett-color-string",
  COLOR_BARLINE: "--sunett-color-barline",
  COLOR_ACCENT: "--sunett-color-accent",
  FONT_NOTE: "--sunett-font-note",
  FONT_LABEL: "--sunett-font-label",
  STRING_OPACITY: "--sunett-string-opacity",
  BARLINE_OPACITY: "--sunett-barline-opacity",
} as const;

export type ThemeVariable =
  (typeof ThemeVariables)[keyof typeof ThemeVariables];

/**
 * Fallback for every variable, used when a consumer sets no theme at all.
 * Values that derive from another variable embed the full `var()` chain so a
 * single substitution stays self-sufficient.
 */
const ThemeVariableFallbacks: Record<ThemeVariable, string> = {
  [ThemeVariables.COLOR_FG]: "currentColor",
  [ThemeVariables.COLOR_MUTED]:
    "color-mix(in srgb, currentColor 55%, transparent)",
  [ThemeVariables.COLOR_NOTE_FG]: "var(--sunett-color-fg, currentColor)",
  [ThemeVariables.COLOR_NOTE_BG]: "Canvas",
  [ThemeVariables.COLOR_STRING]: "var(--sunett-color-fg, currentColor)",
  [ThemeVariables.COLOR_BARLINE]: "var(--sunett-color-fg, currentColor)",
  [ThemeVariables.COLOR_ACCENT]: "var(--sunett-color-fg, currentColor)",
  [ThemeVariables.FONT_NOTE]: "ui-monospace, monospace",
  [ThemeVariables.FONT_LABEL]: "system-ui, sans-serif",
  [ThemeVariables.STRING_OPACITY]: "0.68",
  [ThemeVariables.BARLINE_OPACITY]: "0.68",
};

/**
 * Builds a `var()` reference with the variable's documented fallback baked in.
 * Emitted as an SVG presentation attribute, which sits below every CSS rule in
 * the cascade, so consumer stylesheets override it without `!important`.
 */
export function themeVar(variable: ThemeVariable): string {
  return `var(${variable}, ${ThemeVariableFallbacks[variable]})`;
}
