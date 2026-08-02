import type { SelectionRegion } from "../../selection/selectionRegions";
import type { Rect } from "../../types/UI/rect";
import { ThemeVariables, themeVar } from "../../theme/variables";
import { createSvgElement } from "./svg";

export function renderSelections(
  parent: SVGSVGElement,
  regions: SelectionRegion[],
): void {
  if (regions.length === 0) {
    return;
  }

  const group = createSvgElement("g");
  group.setAttribute("class", "selections");
  group.setAttribute("pointer-events", "none");

  for (const region of regions) {
    group.append(renderRegion(region));
  }

  parent.append(group);
}

function renderRegion(region: SelectionRegion): SVGGElement {
  const color =
    region.selection.color ?? themeVar(ThemeVariables.COLOR_SELECTION);
  const draft = region.draft === true;
  const group = createSvgElement("g");

  group.setAttribute("class", draft ? "selection selection-draft" : "selection");
  group.setAttribute("selection-id", region.selection.id);

  for (const rect of region.rects) {
    group.append(renderRect(rect, color, draft));
  }

  if (region.label) {
    group.append(
      renderLabel(region.label.x, region.label.y, region.label.text, color),
    );
  }

  return group;
}

function renderRect(rect: Rect, color: string, draft: boolean): SVGRectElement {
  const element = createSvgElement("rect");

  element.setAttribute("class", "selection-region");
  element.setAttribute("x", `${rect.x}`);
  element.setAttribute("y", `${rect.y}`);
  element.setAttribute("width", `${rect.width}`);
  element.setAttribute("height", `${rect.height}`);
  element.setAttribute("fill", color);
  element.setAttribute(
    "fill-opacity",
    themeVar(ThemeVariables.SELECTION_OPACITY),
  );

  if (draft) {
    element.setAttribute("stroke", color);
    element.setAttribute("stroke-dasharray", "4 3");
  } else {
    element.setAttribute("stroke", "none");
  }

  return element;
}

function renderLabel(
  x: number,
  y: number,
  text: string,
  color: string,
): SVGTextElement {
  const label = createSvgElement("text");

  label.setAttribute("class", "selection-label");
  label.setAttribute("x", `${x}`);
  label.setAttribute("y", `${y}`);
  label.setAttribute("fill", color);
  label.setAttribute("font-family", themeVar(ThemeVariables.FONT_LABEL));
  label.setAttribute("font-size", themeVar(ThemeVariables.FONT_LABEL_SIZE));
  label.textContent = text;

  return label;
}
