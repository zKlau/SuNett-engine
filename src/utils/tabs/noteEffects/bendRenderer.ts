import { BravuraNotationGlyphs } from "../../../constants/notationGlyphPaths";
import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type { BendEffect } from "../../../types/notes/effects/bend";
import type { EffectRenderState } from "../../../types/UI/noteEffectsRender";
import type { Point } from "../../../types/UI/point";
import { noteEdgeX } from "./effectLayout";
import {
  createEffectGroup,
  createEffectPath,
  createEffectText,
} from "./effectSvg";
import { createNotationGlyph } from "./notationGlyphRenderer";

export function renderBend(
  state: EffectRenderState,
  inheritedBend?: BendEffect,
) {
  const bend = inheritedBend ?? state.entry.context.note.effect.bend;
  if (
    !bend ||
    bend.kind === "None" ||
    (!inheritedBend && state.entry.deferBend)
  ) {
    return;
  }

  const group = createEffectGroup(state, "bend");
  const extendsThroughBeat = Boolean(inheritedBend);
  const points = bendPoints(state, bend, extendsThroughBeat);
  const path = createEffectPath(bendPath(points, extendsThroughBeat));
  const arrow = createBendArrow(points);
  const labelPoint = points.reduce((highest, point) => {
    return point.y <= highest.y ? point : highest;
  }, points[0]);
  const arrowHeight =
    BravuraNotationGlyphs.BEND_ARROW_UP.height *
    constants.NOTE_EFFECT_BEND_ARROW_SCALE;
  const label = createEffectText(
    state,
    bendLabel(bend),
    labelPoint.x,
    labelPoint.y - arrowHeight - constants.NOTE_EFFECT_BEND_LABEL_GAP,
  );

  group.setAttribute("data-bend-kind", bend.kind);
  group.setAttribute("data-bend-value", `${bend.value}`);
  group.append(path, arrow, label);
  state.parent.append(group);
}

function bendPoints(
  state: EffectRenderState,
  bend: BendEffect,
  extendsThroughBeat: boolean,
): Point[] {
  const { context, width } = state.entry;
  const source =
    bend.points.length > 0
      ? bend.points
      : [
          { position: 0, value: 0, vibrato: false },
          {
            position: bend.max_position || 1,
            value: bend.max_value || bend.value || 1,
            vibrato: false,
          },
        ];
  const maxPosition = Math.max(
    1,
    bend.max_position,
    ...source.map((point) => point.position),
  );
  const peak = source.reduce((highest, point) => {
    return Math.abs(point.value) > Math.abs(highest.value) ? point : highest;
  }, source[0]);
  const renderedSource = extendsThroughBeat
    ? [source[0], { ...peak, position: maxPosition }]
    : source;
  const maxValue = Math.max(1, ...source.map((point) => Math.abs(point.value)));
  const effectWidth = extendsThroughBeat
    ? Math.max(
        constants.NOTE_EFFECT_BEND_MIN_WIDTH,
        width * constants.NOTE_EFFECT_TIED_BEND_WIDTH_RATIO,
      )
    : Math.max(
        constants.NOTE_EFFECT_BEND_MIN_WIDTH,
        Math.min(constants.NOTE_EFFECT_BEND_WIDTH, width / 2),
      );
  const startX = noteEdgeX(state.entry, 1);
  const baseY =
    context.y - state.entry.glyphHeight / 2 - constants.NOTE_EFFECT_NOTE_GAP;

  return renderedSource.map((point) => ({
    x: startX + (point.position / maxPosition) * effectWidth,
    y: baseY - (point.value / maxValue) * constants.NOTE_EFFECT_BEND_HEIGHT,
  }));
}

function bendPath(points: Point[], endsVertically: boolean): string {
  if (endsVertically && points.length === 2) {
    const [start, end] = points;
    const width = end.x - start.x;
    const height = start.y - end.y;
    const controlRatio = constants.NOTE_EFFECT_BEND_CURVE_CONTROL_RATIO;
    return `M ${start.x} ${start.y} C ${
      start.x + width * controlRatio
    } ${start.y} ${end.x} ${end.y + height * controlRatio} ${end.x} ${end.y}`;
  }

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const middleX = (previous.x + point.x) / 2;
    return `${path} C ${middleX} ${previous.y} ${middleX} ${point.y} ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function createBendArrow(points: Point[]): SVGPathElement {
  const end = points[points.length - 1];
  const previous = points[points.length - 2] ?? {
    x: end.x,
    y: end.y + 1,
  };
  const pointsUp = end.y <= previous.y;
  const glyph = pointsUp
    ? BravuraNotationGlyphs.BEND_ARROW_UP
    : BravuraNotationGlyphs.BEND_ARROW_DOWN;
  const scale = constants.NOTE_EFFECT_BEND_ARROW_SCALE;
  const height = glyph.height * scale;
  return createNotationGlyph(
    glyph,
    end.x,
    end.y + (pointsUp ? -height / 2 : height / 2),
    scale,
  );
}

function bendLabel(bend: BendEffect): string {
  const semitones = Math.abs(bend.value) / 100;
  if (Math.abs(semitones - 0.5) < 0.01) {
    return "1/2";
  }
  if (Math.abs(semitones - 1) < 0.01) {
    return "full";
  }
  if (semitones > 0) {
    return `${Number(semitones.toFixed(2))}`;
  }
  return "B";
}
