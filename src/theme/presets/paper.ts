import { defineTheme } from "../theme";

/** Warm paper canvas with burgundy notes and soft, muted string lines. */
export const paperTheme = defineTheme({
  colors: {
    fg: "#4b463e",
    muted: "#8b8173",
    background: "#fffefa",
    noteBg: "#fffefa",
    noteFg: "#5c2938",
    string: "#b8ada0",
    barline: "#988b7b",
    rest: "#8b8173",
    accent: "#782d3e",
    selection: "#8b976a",
  },
  fonts: {
    noteFamily: "Consolas, monospace",
    labelFamily: "DM Sans, sans-serif",
    labelSize: 9,
  },
  opacity: { string: 0.65, barline: 0.65, selection: 0.15 },
});
