import type { NormalizedRendererOptions } from "../../types/UI/normalizedRendererOptions";
import { ThemeVariables, themeVar } from "../../theme/variables";
import { buildNoteStyles } from "./notesStyles";
import { createSvgElement } from "./svg";

export function findSvgTarget(
  target: string | SVGSVGElement,
): SVGSVGElement | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const element =
    typeof target === "string" ? document.querySelector(target) : target;
  return element instanceof SVGSVGElement ? element : undefined;
}

export function clearSvg(svg: SVGSVGElement): void {
  while (svg.firstChild) {
    svg.firstChild.remove();
  }
}

export function renderTabBackground(
  svg: SVGSVGElement,
  width: number,
  height: number,
): void {
  const rect = createSvgElement("rect");
  rect.setAttribute("class", "tab-background");
  rect.setAttribute("x", "0");
  rect.setAttribute("y", "0");
  rect.setAttribute("width", `${width}`);
  rect.setAttribute("height", `${height}`);
  rect.setAttribute("fill", themeVar(ThemeVariables.COLOR_BG));
  svg.append(rect);
}

export function renderNoteStyles(
  svg: SVGSVGElement,
  config: NormalizedRendererOptions,
): void {
  if (!config.notes.defaultStyles) {
    return;
  }

  const style = createSvgElement("style");
  style.textContent = buildNoteStyles(config.notes.classPrefix);
  svg.append(style);
}
