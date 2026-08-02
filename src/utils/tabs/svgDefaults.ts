import type { ThemeVariable } from "../../theme/variables";
import { ThemeVariables, themeVar } from "../../theme/variables";

export function applyLineDefaults(
  path: SVGPathElement,
  colorVariable: ThemeVariable,
  opacityVariable: ThemeVariable,
): void {
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", themeVar(colorVariable));
  path.setAttribute("opacity", themeVar(opacityVariable));
  path.setAttribute("stroke-linecap", "butt");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  path.setAttribute("shape-rendering", "crispEdges");
}

export function applyLabelDefaults(text: SVGTextElement): void {
  text.setAttribute("fill", themeVar(ThemeVariables.COLOR_MUTED));
  text.setAttribute("font-family", themeVar(ThemeVariables.FONT_LABEL));
  text.setAttribute("font-size", themeVar(ThemeVariables.FONT_LABEL_SIZE));
}
