/**
 * @jest-environment jsdom
 */
import {
  applyTheme,
  clearTheme,
  defineTheme,
  mergeThemes,
} from "../src/theme/theme";

describe("defineTheme", () => {
  it("maps every supported field to its CSS variable", () => {
    const theme = defineTheme({
      colors: {
        fg: "#111",
        muted: "#666",
        noteFg: "#111",
        noteBg: "#fff",
        string: "#222",
        barline: "#333",
        accent: "#c084fc",
      },
      fonts: { note: "JetBrains Mono, monospace", label: "system-ui" },
      opacity: { string: 0.7, barline: 0.9 },
    });

    expect(theme.variables).toEqual({
      "--sunett-color-fg": "#111",
      "--sunett-color-muted": "#666",
      "--sunett-color-note-fg": "#111",
      "--sunett-color-note-bg": "#fff",
      "--sunett-color-string": "#222",
      "--sunett-color-barline": "#333",
      "--sunett-color-accent": "#c084fc",
      "--sunett-font-note": "JetBrains Mono, monospace",
      "--sunett-font-label": "system-ui",
      "--sunett-string-opacity": "0.7",
      "--sunett-barline-opacity": "0.9",
    });
  });

  it("omits fields that were not provided", () => {
    const theme = defineTheme({ colors: { fg: "#111" } });

    expect(theme.variables).toEqual({ "--sunett-color-fg": "#111" });
  });

  it("produces an empty map for an empty input", () => {
    expect(defineTheme({}).variables).toEqual({});
  });

  it("ignores explicitly undefined fields", () => {
    const theme = defineTheme({ colors: { fg: "#111", accent: undefined } });

    expect(theme.variables).toEqual({ "--sunett-color-fg": "#111" });
  });

  it("stringifies numeric opacity", () => {
    const theme = defineTheme({ opacity: { string: 0 } });

    expect(theme.variables).toEqual({ "--sunett-string-opacity": "0" });
  });
});

describe("mergeThemes", () => {
  it("lets later themes win per variable", () => {
    const base = defineTheme({ colors: { fg: "#111", accent: "#f00" } });
    const override = defineTheme({ colors: { accent: "#0f0" } });

    expect(mergeThemes(base, override).variables).toEqual({
      "--sunett-color-fg": "#111",
      "--sunett-color-accent": "#0f0",
    });
  });

  it("returns an empty theme when given nothing", () => {
    expect(mergeThemes().variables).toEqual({});
  });
});

describe("applyTheme", () => {
  it("writes the variables onto the element", () => {
    const element = document.createElement("div");

    applyTheme(defineTheme({ colors: { fg: "#111" } }), element);

    expect(element.style.getPropertyValue("--sunett-color-fg")).toBe("#111");
  });

  it("clearTheme removes previously applied variables", () => {
    const element = document.createElement("div");
    applyTheme(
      defineTheme({ colors: { fg: "#111", accent: "#0f0" } }),
      element,
    );

    clearTheme(element);

    expect(element.style.getPropertyValue("--sunett-color-fg")).toBe("");
    expect(element.style.getPropertyValue("--sunett-color-accent")).toBe("");
  });
});
