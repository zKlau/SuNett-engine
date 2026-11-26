import { BravuraNotationGlyphs } from "../../../constants/notationGlyphPaths";
import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type { BendEffect } from "../../../types/notes/effects/bend";
import { isReleaseBend } from "../../../types/notes/effects/bend";
import type {
  EffectRenderState,
  PositionedNote,
} from "../../../types/UI/noteEffectsRender";
import type { Point } from "../../../types/UI/point";
import { noteEdgeX } from "./effectLayout";
import {
  createEffectGroup,
  createEffectPath,
  createEffectText,
  effectFontSize,
} from "./effectSvg";
import { createNotationGlyph } from "./notationGlyphRenderer";

export function renderBend(
  state: EffectRenderState,
  measureEndX: number,
  bendOrigin?: PositionedNote,
) {
  const { entry } = state;
  const noteBend = entry.context.note.effect.bend;
  const inheritedBend = bendOrigin?.context.note.effect.bend;
  const bend = inheritedBend ?? noteBend;
  if (!bend || bend.kind === "None" || (!inheritedBend && entry.deferBend)) {
    return;
  }

  const tiedRelease =
    entry.context.note.kind === "Tie" && noteBend && isReleaseBend(noteBend)
      ? noteBend
      : undefined;
  const pairedRelease = inheritedBend ? tiedRelease : undefined;
  const startsBent = Boolean(tiedRelease && !pairedRelease);
  const curve = bendCurve(bend, Boolean(inheritedBend && !pairedRelease));
  const releaseCurve = pairedRelease ? bendCurve(pairedRelease) : [];

  const arrowHalfWidth =
    (BravuraNotationGlyphs.BEND_ARROW_UP.width *
      constants.NOTE_EFFECT_BEND_ARROW_SCALE) /
    2;
  const rightX = measureEndX - constants.MEASURE_CONTENT_PADDING_END;
  const pathRightX = rightX - arrowHalfWidth;
  const releaseStartX = noteEdgeX(entry, 1);
  const startX = Math.min(
    pairedRelease && bendOrigin ? noteEdgeX(bendOrigin, 1) : releaseStartX,
    pathRightX,
  );
  const endX = Math.min(
    releaseStartX + bendWidth(entry, Boolean(inheritedBend && !pairedRelease)),
    pathRightX,
  );
  const joinX = pairedRelease
    ? Math.max(
        startX,
        Math.min(
          releaseStartX,
          endX - constants.NOTE_EFFECT_BEND_MIN_WIDTH / 2,
        ),
      )
    : endX;
  const baseY =
    entry.context.y - entry.glyphHeight / 2 - constants.NOTE_EFFECT_NOTE_GAP;
  const maxPitch = Math.max(
    1 / Math.abs(bend.semitone_length || 1),
    ...curve.map((point) => Math.abs(point.pitch)),
    ...releaseCurve.map((point) => Math.abs(point.pitch)),
  );
  const points = positionBendCurve(curve, startX, joinX, baseY, maxPitch);
  if (pairedRelease) {
    const releasePoints = positionBendCurve(
      releaseCurve,
      joinX,
      endX,
      baseY,
      maxPitch,
    );
    const joinPoint = points[points.length - 1];
    if (
      releasePoints[0].x === joinPoint.x &&
      releasePoints[0].y === joinPoint.y
    ) {
      releasePoints.shift();
    }
    points.push(...releasePoints);
  }
  if (!startsBent && points[0].y !== baseY) {
    points.unshift({ x: points[0].x, y: baseY });
  }

  const group = createEffectGroup(state, "bend");
  const path = createEffectPath(bendPath(points));
  const arrows = points.flatMap((point, index) => {
    const previous = points[index - 1];
    if (!previous || point.y === previous.y) {
      return [];
    }
    return [createBendArrow(point, point.y < previous.y)];
  });
  group.setAttribute(
    "data-bend-kind",
    pairedRelease ? "BendRelease" : bend.kind,
  );
  group.setAttribute("data-bend-value", `${bend.value}`);
  group.append(path, ...arrows);
  if (!startsBent) {
    const labelPoint = points.reduce((highest, point) => {
      return point.y < highest.y ? point : highest;
    }, points[0]);
    const arrowHeight =
      BravuraNotationGlyphs.BEND_ARROW_UP.height *
      constants.NOTE_EFFECT_BEND_ARROW_SCALE;
    const label = bendLabel(bend);
    const labelHalfWidth =
      (label.length *
        effectFontSize(entry.context.fontSize) *
        constants.NOTE_GLYPH_WIDTH_RATIO) /
      2;
    group.append(
      createEffectText(
        state,
        label,
        Math.min(labelPoint.x, rightX - labelHalfWidth),
        labelPoint.y - arrowHeight - constants.NOTE_EFFECT_BEND_LABEL_GAP,
      ),
    );
  }
  state.parent.append(group);
}

function bendWidth(entry: PositionedNote, extendsThroughBeat: boolean): number {
  const glyphHalfWidth =
    entry.labelVisible === false ? 0 : entry.glyphWidth / 2;
  return Math.max(
    constants.NOTE_EFFECT_BEND_MIN_WIDTH,
    extendsThroughBeat
      ? entry.width * constants.NOTE_EFFECT_TIED_BEND_WIDTH_RATIO
      : Math.min(
          constants.NOTE_EFFECT_BEND_WIDTH,
          entry.width / 2 -
            glyphHalfWidth -
            constants.NOTE_EFFECT_NOTE_GAP -
            constants.NOTE_EFFECT_BEND_END_GAP,
        ),
  );
}

type BendCurvePoint = { progress: number; pitch: number };

function bendCurve(
  bend: BendEffect,
  extendsThroughBeat = false,
): BendCurvePoint[] {
  const fallbackRelease = isReleaseBend(bend);
  const fallbackPitch = bend.max_value || bend.value || 1;
  const source =
    bend.points.length > 0
      ? bend.points
      : [
          {
            position: 0,
            value: fallbackRelease ? fallbackPitch : 0,
            vibrato: false,
          },
          {
            position: bend.max_position || 1,
            value: fallbackRelease ? 0 : fallbackPitch,
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
  return simplified.map((point) => ({
    progress: point.position / maxPosition,
    pitch: point.value / (bend.semitone_length || 1),
  }));
}

function positionBendCurve(
  curve: BendCurvePoint[],
  startX: number,
  endX: number,
  baseY: number,
  maxPitch: number,
): Point[] {
  return curve.map(({ progress, pitch }) => ({
    x: startX + progress * (endX - startX),
    y: baseY - (pitch / maxPitch) * constants.NOTE_EFFECT_BEND_HEIGHT,
  }));
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
