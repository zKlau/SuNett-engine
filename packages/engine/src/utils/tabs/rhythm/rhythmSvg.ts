import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../../theme/variables";
import { createSvgElement } from "../svg";

export function createRhythmPath(
  data: string,
  className: string,
  width = constants.NOTE_EFFECT_STROKE_WIDTH,
): SVGPathElement {
  const path = createSvgElement("path");
  path.setAttribute("class", className);
  path.setAttribute("d", data);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", themeVar(ThemeVariables.COLOR_MUTED));
  path.setAttribute("stroke-width", `${width}`);
  path.setAttribute("stroke-linecap", "butt");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  return path;
}
