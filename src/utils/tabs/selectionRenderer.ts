import type { SelectionRegion } from "../../selection/selectionRegions";
import type { Rect } from "../../types/UI/rect";
import { ThemeVariables, themeVar } from "../../theme/variables";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg" as const;

export function renderSelections(
  parent: SVGSVGElement,
  regions: SelectionRegion[],
): void {
  if (regions.length === 0) {
    return;
  }

  const group = createElement("g");
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
  const group = createElement("g");

  group.setAttribute("class", "selection");
  group.setAttribute("selection-id", region.selection.id);

  for (const rect of region.rects) {
    group.append(renderRect(rect, color));
  }

  if (region.label) {
    group.append(
      renderLabel(region.label.x, region.label.y, region.label.text, color),
    );
  }

  return group;
}

function renderRect(rect: Rect, color: string): SVGRectElement {
  const element = createElement("rect");

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
  element.setAttribute("stroke", "none");

  return element;
}

function renderLabel(
  x: number,
  y: number,
  text: string,
  color: string,
): SVGTextElement {
  const label = createElement("text");

  label.setAttribute("class", "selection-label");
  label.setAttribute("x", `${x}`);
  label.setAttribute("y", `${y}`);
  label.setAttribute("fill", color);
  label.setAttribute("font-family", themeVar(ThemeVariables.FONT_LABEL));
  label.setAttribute("font-size", themeVar(ThemeVariables.FONT_LABEL_SIZE));
  label.textContent = text;

  return label;
}

function createElement<Key extends keyof SVGElementTagNameMap>(
  tagName: Key,
): SVGElementTagNameMap[Key] {
  return document.createElementNS(SVG_NAMESPACE, tagName);
}
