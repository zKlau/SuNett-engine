import { defineTheme } from "../theme";

/**
 * Accessibility-first preset. Built on the CSS system colours (`CanvasText`,
 * `Canvas`, `LinkText`) so it resolves to a maximum-contrast pair on light and
 * dark hosts alike, and honours forced-colours / OS high-contrast modes. Muted
 * text and line opacity are pinned to full strength — dimming is what usually
 * breaks contrast ratios.
 */
export const highContrastTheme = defineTheme({
  colors: {
    fg: "CanvasText",
    muted: "CanvasText",
    noteFg: "CanvasText",
    noteBg: "Canvas",
    string: "CanvasText",
    barline: "CanvasText",
    accent: "LinkText",
  },
  opacity: {
    string: 1,
    barline: 1,
  },
});
