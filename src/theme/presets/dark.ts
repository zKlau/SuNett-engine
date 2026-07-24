import { defineTheme } from "../theme";

/**
 * Explicit dark palette. Deliberately does not consult
 * `prefers-color-scheme`, a consumer opts in, so a page that intentionally
 * runs inverted is never overridden.
 */
export const darkTheme = defineTheme({
  colors: {
    fg: "#e5e7eb",
    muted: "#9ca3af",
    noteFg: "#f3f4f6",
    noteBg: "#16171d",
    background: "#16171d",
    string: "#6b7280",
    barline: "#9ca3af",
    accent: "#c084fc",
  },
  opacity: {
    string: 0.85,
    barline: 0.85,
  },
  sizing: {
    noteFontSize: 24,
  },
});
