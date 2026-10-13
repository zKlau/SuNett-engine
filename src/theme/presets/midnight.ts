import { defineTheme } from "../theme";

/** Charcoal canvas with warm notes and sage strings, independent of OS theme. */
export const midnightTheme = defineTheme({
  colors: {
    fg: "#e7e2d6",
    muted: "#a6ad9f",
    background: "#272a29",
    noteBg: "#272a29",
    noteFg: "#e9ccbb",
    string: "#a1aa93",
    barline: "#a1aa93",
    rest: "#a6ad9f",
    accent: "#dab5ad",
    selection: "#becb91",
  },
  fonts: {
    noteFamily: "Consolas, monospace",
    labelFamily: "DM Sans, sans-serif",
    labelSize: 9,
  },
  opacity: { string: 0.45, barline: 0.65, selection: 0.15 },
});
