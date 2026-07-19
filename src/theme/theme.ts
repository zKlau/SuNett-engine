import type { ThemeVariable } from "./variables";
import { ThemeVariables } from "./variables";

export type ThemeColors = {
  fg?: string;
  muted?: string;
  noteFg?: string;
  noteBg?: string;
  string?: string;
  barline?: string;
  accent?: string;
};

export type ThemeFonts = {
  note?: string;
  label?: string;
  /** A CSS length, or a number treated as `px`. */
  labelSize?: string | number;
};

export type ThemeOpacity = {
  string?: number | string;
  barline?: number | string;
};

/** The argument to {@link defineTheme}. Every field is optional. */
export type ThemeInput = {
  colors?: ThemeColors;
  fonts?: ThemeFonts;
  opacity?: ThemeOpacity;
};

/**
 * A resolved theme. Treat it as opaque — build one with {@link defineTheme}
 * rather than constructing the variable map by hand.
 */
export type Theme = {
  readonly variables: Readonly<Partial<Record<ThemeVariable, string>>>;
};

const COLOR_VARIABLES: Record<keyof ThemeColors, ThemeVariable> = {
  fg: ThemeVariables.COLOR_FG,
  muted: ThemeVariables.COLOR_MUTED,
  noteFg: ThemeVariables.COLOR_NOTE_FG,
  noteBg: ThemeVariables.COLOR_NOTE_BG,
  string: ThemeVariables.COLOR_STRING,
  barline: ThemeVariables.COLOR_BARLINE,
  accent: ThemeVariables.COLOR_ACCENT,
};

const FONT_VARIABLES: Record<keyof ThemeFonts, ThemeVariable> = {
  note: ThemeVariables.FONT_NOTE,
  label: ThemeVariables.FONT_LABEL,
  labelSize: ThemeVariables.FONT_LABEL_SIZE,
};

const OPACITY_VARIABLES: Record<keyof ThemeOpacity, ThemeVariable> = {
  string: ThemeVariables.STRING_OPACITY,
  barline: ThemeVariables.BARLINE_OPACITY,
};

/**
 * Turns a friendly theme description into the CSS variable map the renderer
 * applies. Omitted fields are left unset so the variable's built-in fallback
 * (or a consumer stylesheet) still applies.
 */
export function defineTheme(input: ThemeInput): Theme {
  const variables: Partial<Record<ThemeVariable, string>> = {};

  collectSection(variables, COLOR_VARIABLES, input.colors);
  collectSection(variables, FONT_VARIABLES, normalizeFonts(input.fonts));
  collectSection(variables, OPACITY_VARIABLES, input.opacity);

  return { variables };
}

/** Lets `labelSize` be given as a bare number, since `font-size` needs a unit. */
function normalizeFonts(fonts: ThemeFonts | undefined) {
  if (!fonts || typeof fonts.labelSize !== "number") {
    return fonts;
  }
  return { ...fonts, labelSize: `${fonts.labelSize}px` };
}

/**
 * Layers themes left to right; later themes win per variable. Useful for
 * tweaking a preset without restating it.
 */
export function mergeThemes(...themes: Theme[]): Theme {
  const variables: Partial<Record<ThemeVariable, string>> = {};

  for (const theme of themes) {
    Object.assign(variables, theme.variables);
  }

  return { variables };
}

/** Writes a theme's variables onto an element, scoping it to that subtree. */
export function applyTheme(theme: Theme, element: SVGElement | HTMLElement) {
  for (const [variable, value] of Object.entries(theme.variables)) {
    element.style.setProperty(variable, value);
  }
}

/** Removes every variable a theme could have set, restoring the fallbacks. */
export function clearTheme(element: SVGElement | HTMLElement) {
  for (const variable of Object.values(ThemeVariables)) {
    element.style.removeProperty(variable);
  }
}

function collectSection<TSection extends Record<string, unknown>>(
  variables: Partial<Record<ThemeVariable, string>>,
  mapping: Record<keyof TSection, ThemeVariable>,
  section: TSection | undefined,
) {
  if (!section) {
    return;
  }

  for (const key of Object.keys(mapping) as (keyof TSection)[]) {
    const value = section[key];
    if (value === undefined || value === null) {
      continue;
    }
    variables[mapping[key]] = `${value}`;
  }
}
