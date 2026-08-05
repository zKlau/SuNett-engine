import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { CursorGeometry } from "../../playback/cursorGeometry";
import { ThemeVariables, themeVar } from "../../theme/variables";
import { createSvgElement } from "./svg";

export function createCursorLine(
  parent: SVGSVGElement,
  height: number,
): SVGLineElement {
  const line = createSvgElement("line");
  line.setAttribute("class", "playback-cursor");
  line.setAttribute("pointer-events", "none");
  line.setAttribute("stroke", themeVar(ThemeVariables.COLOR_CURSOR));
  line.setAttribute("stroke-width", `${constants.CURSOR_WIDTH}`);
  line.setAttribute("x1", "0");
  line.setAttribute("x2", "0");
  line.setAttribute("y1", "0");
  line.setAttribute("y2", `${height}`);
  line.style.willChange = "transform";
  parent.append(line);
  return line;
}

export function positionCursorLine(
  line: SVGLineElement,
  geometry: CursorGeometry,
): void {
  line.style.transform = `translate(${geometry.x}px, ${geometry.y}px)`;
}
