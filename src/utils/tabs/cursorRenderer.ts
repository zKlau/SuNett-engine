import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { CursorGeometry } from "../../playback/cursorGeometry";
import { ThemeVariables, themeVar } from "../../theme/variables";
import { createSvgElement } from "./svg";

export function createCursorLine(parent: SVGSVGElement): SVGLineElement {
  const line = createSvgElement("line");
  line.setAttribute("class", "playback-cursor");
  line.setAttribute("pointer-events", "none");
  line.setAttribute("stroke", themeVar(ThemeVariables.COLOR_CURSOR));
  line.setAttribute("stroke-width", `${constants.CURSOR_WIDTH}`);
  parent.append(line);
  return line;
}

export function positionCursorLine(
  line: SVGLineElement,
  geometry: CursorGeometry,
): void {
  line.setAttribute("x1", `${geometry.x}`);
  line.setAttribute("x2", `${geometry.x}`);
  line.setAttribute("y1", `${geometry.y}`);
  line.setAttribute("y2", `${geometry.y + geometry.height}`);
}
