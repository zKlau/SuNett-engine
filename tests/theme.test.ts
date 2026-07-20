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
      fonts: {
        noteFamily: "JetBrains Mono, monospace",
        labelFamily: "system-ui",
        labelSize: 13,
      },
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
      "--sunett-font-label-size": "13px",
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

  it("treats a numeric labelSize as px and a string as a raw length", () => {
    expect(defineTheme({ fonts: { labelSize: 14 } }).variables).toEqual({
      "--sunett-font-label-size": "14px",
    });
    expect(defineTheme({ fonts: { labelSize: "1rem" } }).variables).toEqual({
      "--sunett-font-label-size": "1rem",
    });
  });

  it("keeps sizing off the variable map and on its own field", () => {
    const theme = defineTheme({
      sizing: { noteFontSize: 18, stringSpacing: 22 },
    });

    expect(theme.variables).toEqual({});
    expect(theme.sizing).toEqual({ noteFontSize: 18, stringSpacing: 22 });
  });

  it("leaves sizing undefined when not provided or empty", () => {
    expect(defineTheme({}).sizing).toBeUndefined();
    expect(defineTheme({ sizing: {} }).sizing).toBeUndefined();
    expect(
      defineTheme({ sizing: { noteFontSize: undefined } }).sizing,
    ).toBeUndefined();
  });

  it("keeps only the sizing keys that were set", () => {
    expect(defineTheme({ sizing: { noteFontSize: 18 } }).sizing).toEqual({
      noteFontSize: 18,
    });
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

  it("merges sizing per key, later themes winning", () => {
    const base = defineTheme({
      sizing: { noteFontSize: 12, stringSpacing: 16 },
    });
    const override = defineTheme({ sizing: { noteFontSize: 20 } });

    expect(mergeThemes(base, override).sizing).toEqual({
      noteFontSize: 20,
      stringSpacing: 16,
    });
  });

  it("leaves merged sizing undefined when no theme sets it", () => {
    expect(
      mergeThemes(defineTheme({}), defineTheme({})).sizing,
    ).toBeUndefined();
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
