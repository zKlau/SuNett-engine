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
  const path = createEffectPath(bendPath(points));
  const arrows = points.flatMap((point, index) => {
    const previous = points[index - 1];
    if (!previous || point.y === previous.y) {
      return [];
    }
    return [createBendArrow(point, point.y < previous.y)];
  });
  const labelPoint = points.reduce((highest, point) => {
    return point.y < highest.y ? point : highest;
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
  group.append(path, ...arrows, label);
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
  const renderedSource =
    extendsThroughBeat && bend.kind === "Bend" && source[0].value === 0
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
        Math.min(
          constants.NOTE_EFFECT_BEND_WIDTH,
          width / 2 -
            state.entry.glyphWidth / 2 -
            constants.NOTE_EFFECT_NOTE_GAP -
            constants.NOTE_EFFECT_BEND_END_GAP,
        ),
      );
  const startX = noteEdgeX(state.entry, 1);
  const baseY =
    context.y - state.entry.glyphHeight / 2 - constants.NOTE_EFFECT_NOTE_GAP;

  const simplified = renderedSource.filter((point, index, all) => {
    if (index === 0 || index === all.length - 1) {
      return true;
    }
    const previous = all[index - 1];
    const next = all[index + 1];
    return (
      Math.abs(
        (point.value - previous.value) * (next.position - point.position) -
          (next.value - point.value) * (point.position - previous.position),
      ) > constants.NOTE_EFFECT_BEND_POINT_EPSILON
    );
  });
  const points = simplified.map((point) => ({
    x: startX + (point.position / maxPosition) * effectWidth,
    y: baseY - (point.value / maxValue) * constants.NOTE_EFFECT_BEND_HEIGHT,
  }));
  if (points[0].y !== baseY) {
    points.unshift({ x: points[0].x, y: baseY });
  }
  return points;
}

function bendPath(points: Point[]): string {
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    if (point.y === previous.y || point.x === previous.x) {
      return `${path} L ${point.x} ${point.y}`;
    }
    const width = point.x - previous.x;
    const height = previous.y - point.y;
    const controlRatio = constants.NOTE_EFFECT_BEND_CURVE_CONTROL_RATIO;
    return `${path} C ${previous.x + width * controlRatio} ${previous.y} ${point.x} ${point.y + height * controlRatio} ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function createBendArrow(end: Point, pointsUp: boolean): SVGPathElement {
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
  const peak = Math.max(
    0,
    ...bend.points.map((point) => Math.abs(point.value)),
  );
  const tones =
    peak > 0
      ? peak / (4 * (bend.semitone_length || 1))
      : Math.abs(bend.value) / 100;
  if (Math.abs(tones - 0.5) < 0.01) {
    return "1/2";
  }
  if (Math.abs(tones - 1) < 0.01) {
    return "full";
  }
  if (tones > 0) {
    return `${Number(tones.toFixed(2))}`;
  }
  return "B";
}
