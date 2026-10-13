import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../../theme/variables";
import type { EffectRenderState } from "../../../types/UI/noteEffectsRender";
import { createSvgElement } from "../svg";

export function createEffectGroup(
  state: EffectRenderState,
  effect: string,
): SVGGElement {
  const group = createSvgElement("g");
  group.setAttribute(
    "class",
    `${state.classPrefix}-effect ${state.classPrefix}-effect--${effect}`,
  );
  group.setAttribute("data-effect", effect);
  group.setAttribute("data-string", `${state.entry.context.note.string}`);
  group.setAttribute(
    "data-measure-index",
    `${state.entry.context.measureIndex}`,
  );
  group.setAttribute("data-beat-index", `${state.entry.context.beatIndex}`);
  group.setAttribute("pointer-events", "none");
  return group;
}

export function createEffectText(
  state: EffectRenderState,
  value: string,
  x: number,
  y: number,
): SVGTextElement {
  const text = createSvgElement("text");
  text.setAttribute("fill", themeVar(ThemeVariables.COLOR_NOTE_FG));
  text.setAttribute("font-family", themeVar(ThemeVariables.FONT_NOTE));
  text.setAttribute(
    "font-size",
    `${effectFontSize(state.entry.context.fontSize)}`,
  );
  text.setAttribute("x", `${x}`);
  text.setAttribute("y", `${y}`);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.textContent = value;
  return text;
}

export function createSpanText(
  value: string,
  x: number,
  y: number,
  fontSize: number,
): SVGTextElement {
  const text = createSvgElement("text");
  text.setAttribute("fill", themeVar(ThemeVariables.COLOR_MUTED));
  text.setAttribute("font-family", themeVar(ThemeVariables.FONT_LABEL));
  text.setAttribute("font-size", `${fontSize}`);
  text.setAttribute("x", `${x}`);
  text.setAttribute("y", `${y}`);
  text.setAttribute("text-anchor", "start");
  text.setAttribute("dominant-baseline", "central");
  text.textContent = value;
  return text;
}

export function createEffectPath(data: string): SVGPathElement {
  const path = createSvgElement("path");
  path.setAttribute("d", data);
  applyEffectPathDefaults(path);
  return path;
}

export function createMutedEffectPath(data: string): SVGPathElement {
  const path = createSvgElement("path");
  path.setAttribute("d", data);
  applyEffectPathDefaults(path, ThemeVariables.COLOR_MUTED);
  return path;
}

export function applyEffectPathDefaults(
  element: SVGElement,
  color:
    | typeof ThemeVariables.COLOR_NOTE_FG
    | typeof ThemeVariables.COLOR_MUTED = ThemeVariables.COLOR_NOTE_FG,
) {
  element.setAttribute("fill", "none");
  element.setAttribute("stroke", themeVar(color));
  element.setAttribute("stroke-width", `${constants.NOTE_EFFECT_STROKE_WIDTH}`);
  element.setAttribute("stroke-linecap", "round");
  element.setAttribute("stroke-linejoin", "round");
  element.setAttribute("vector-effect", "non-scaling-stroke");
}

export function effectFontSize(noteFontSize: number): number {
  return Math.max(
    constants.NOTE_EFFECT_MIN_FONT_SIZE,
    noteFontSize * constants.NOTE_EFFECT_FONT_RATIO,
  );
}
