import { ThemeVariables, themeVar } from "../../../theme/variables";
import type { ThemeVariable } from "../../../theme/variables";
import type { NotationGlyph } from "../../../types/UI/notationGlyph";
import { createSvgElement } from "./effectSvg";

export function createNotationGlyph(
  glyph: NotationGlyph,
  x: number,
  y: number,
  scale: number,
  color: ThemeVariable = ThemeVariables.COLOR_NOTE_FG,
): SVGPathElement {
  const path = createSvgElement("path");
  path.setAttribute("d", glyph.path);
  path.setAttribute("fill", themeVar(color));
  path.setAttribute("stroke", "none");
  path.setAttribute(
    "transform",
    `translate(${x - glyph.centerX * scale} ${y + glyph.centerY * scale}) scale(${scale} ${-scale})`,
  );
  return path;
}
