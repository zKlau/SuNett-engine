import { coerceTheme } from "../src/theme/resolveTheme";
import { defineTheme } from "../src/theme/theme";
import { ThemePresets } from "../src/theme/presets";

describe("coerceTheme", () => {
  it("resolves a preset name to its registered theme", () => {
    expect(coerceTheme("dark")).toBe(ThemePresets.dark);
  });

  it("passes an already-built theme through untouched", () => {
    const theme = defineTheme({ colors: { fg: "#111" } });

    expect(coerceTheme(theme)).toBe(theme);
  });

  it("builds a theme from a plain ThemeInput", () => {
    expect(coerceTheme({ colors: { fg: "#111" } }).variables).toEqual({
      "--sunett-color-fg": "#111",
    });
  });

  it("degrades an unknown preset name to an empty theme", () => {
    expect(coerceTheme("nope" as "dark").variables).toEqual({});
  });

  it("returns an empty theme for undefined", () => {
    expect(coerceTheme(undefined).variables).toEqual({});
  });
});
