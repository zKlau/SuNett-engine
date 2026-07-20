import type { ThemeVariable } from "./variables";
import { ThemeVariables } from "./variables";

export type ThemeColors = {
  fg?: string;
  muted?: string;
  noteFg?: string;
  noteBg?: string;
  /** Fill for the whole tab canvas. Defaults to transparent (inherits page). */
  background?: string;
  string?: string;
  barline?: string;
  accent?: string;
};

export type ThemeFonts = {
  /** `font-family` for note text. */
  noteFamily?: string;
  /** `font-family` for labels (measure indices, repeat counts, tuning). */
  labelFamily?: string;
  /** Label `font-size` as a CSS length, or a number treated as `px`. */
  labelSize?: string | number;
};

export type ThemeOpacity = {
  string?: number | string;
  barline?: number | string;
};

/**
 * Numeric sizes the renderer reads before it lays the tab out. Unlike the other
 * sections these are not CSS variables: note font size feeds the TS-measured
 * note background, and string spacing feeds the SVG viewBox, so both must be
 * known to the layout math a stylesheet cannot reach. Consequently sizing works
 * from `defineTheme` only, never from a preset CSS file.
 */
export type ThemeSizing = {
  noteFontSize?: number;
  stringSpacing?: number;
  rowSpacing?: number;
};

/** The argument to {@link defineTheme}. Every field is optional. */
export type ThemeInput = {
  colors?: ThemeColors;
  fonts?: ThemeFonts;
  opacity?: ThemeOpacity;
  sizing?: ThemeSizing;
};

/**
 * A resolved theme. Treat it as opaque — build one with {@link defineTheme}
 * rather than constructing it by hand.
 */
export type Theme = {
  readonly variables: Readonly<Partial<Record<ThemeVariable, string>>>;
  readonly sizing?: Readonly<ThemeSizing>;
};

const COLOR_VARIABLES: Record<keyof ThemeColors, ThemeVariable> = {
  fg: ThemeVariables.COLOR_FG,
  muted: ThemeVariables.COLOR_MUTED,
  noteFg: ThemeVariables.COLOR_NOTE_FG,
  noteBg: ThemeVariables.COLOR_NOTE_BG,
  background: ThemeVariables.COLOR_BG,
  string: ThemeVariables.COLOR_STRING,
  barline: ThemeVariables.COLOR_BARLINE,
  accent: ThemeVariables.COLOR_ACCENT,
};

const FONT_VARIABLES: Record<keyof ThemeFonts, ThemeVariable> = {
  noteFamily: ThemeVariables.FONT_NOTE,
  labelFamily: ThemeVariables.FONT_LABEL,
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

  return { variables, sizing: normalizeSizing(input.sizing) };
}

function normalizeSizing(
  sizing: ThemeSizing | undefined,
): ThemeSizing | undefined {
  if (!sizing) {
    return undefined;
  }

  const resolved: ThemeSizing = {};
  if (sizing.noteFontSize !== undefined) {
    resolved.noteFontSize = sizing.noteFontSize;
  }
  if (sizing.stringSpacing !== undefined) {
    resolved.stringSpacing = sizing.stringSpacing;
  }
  if (sizing.rowSpacing !== undefined) {
    resolved.rowSpacing = sizing.rowSpacing;
  }

  return Object.keys(resolved).length > 0 ? resolved : undefined;
}

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
  let sizing: ThemeSizing | undefined;

  for (const theme of themes) {
    Object.assign(variables, theme.variables);
    if (theme.sizing) {
      sizing = { ...sizing, ...theme.sizing };
    }
  }

  return { variables, sizing };
}

export function applyTheme(theme: Theme, element: SVGElement | HTMLElement) {
  for (const [variable, value] of Object.entries(theme.variables)) {
    element.style.setProperty(variable, value);
  }
}

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
