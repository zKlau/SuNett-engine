import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ThemePresets,
  isPresetTheme,
  resolvePreset,
} from "../src/theme/presets";
import { ThemeVariables } from "../src/theme/variables";
import type { PresetTheme } from "../src/theme/presets";

const STYLES_DIR = join(__dirname, "..", "styles");

const KNOWN_VARIABLES = new Set<string>(Object.values(ThemeVariables));

function readThemeCss(file: string): Record<string, string> {
  const source = readFileSync(join(STYLES_DIR, file), "utf8");
  const declarations: Record<string, string> = {};

  for (const [, name, value] of source.matchAll(
    /(--sunett-[a-z-]+)\s*:\s*([^;]+);/g,
  )) {
    declarations[name] = value.trim();
  }

  return declarations;
}

describe("theme preset registry", () => {
  it.each(Object.keys(ThemePresets) as PresetTheme[])(
    "resolves the %s preset",
    (name) => {
      expect(resolvePreset(name)).toBe(ThemePresets[name]);
    },
  );

  it("only emits known CSS variables", () => {
    for (const theme of Object.values(ThemePresets)) {
      for (const variable of Object.keys(theme.variables)) {
        expect(KNOWN_VARIABLES).toContain(variable);
      }
    }
  });

  it("leaves the default preset empty so currentColor drives the tab", () => {
    expect(ThemePresets.default.variables).toEqual({});
  });

  it("recognises preset names and rejects anything else", () => {
    expect(isPresetTheme("dark")).toBe(true);
    expect(isPresetTheme("high-contrast")).toBe(true);
    expect(isPresetTheme("nope")).toBe(false);
    expect(isPresetTheme(undefined)).toBe(false);
    expect(isPresetTheme({ variables: {} })).toBe(false);
  });
});

describe("preset CSS files match their JS presets", () => {
  it.each([
    ["dark", "themes/dark.css"],
    ["high-contrast", "themes/high-contrast.css"],
  ] as const)("%s", (name, file) => {
    expect(readThemeCss(file)).toEqual(ThemePresets[name].variables);
  });

  it("base.css declares every known variable", () => {
    expect(Object.keys(readThemeCss("base.css")).sort()).toEqual(
      [...KNOWN_VARIABLES].sort(),
    );
  });
});
