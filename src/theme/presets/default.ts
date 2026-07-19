import { defineTheme } from "../theme";

/**
 * Neutral baseline. Sets no colours, so everything resolves through
 * `currentColor` and the tab inherits the host page's text colour — it already
 * reads correctly on light and dark pages alike. Pass the `dark` preset to opt
 * into an explicit dark palette instead.
 */
export const defaultTheme = defineTheme({});
