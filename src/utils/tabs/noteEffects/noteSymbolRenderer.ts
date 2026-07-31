import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type { BendEffect } from "../../../types/notes/effects/bend";
import type { EffectRenderState } from "../../../types/UI/noteEffectsRender";
import { noteEdgeX } from "./effectLayout";
import {
  applyEffectPathDefaults,
  createEffectGroup,
  createEffectPath,
  createEffectText,
  createSvgElement,
} from "./effectSvg";

type Point = {
  x: number;
  y: number;
};

export function renderNoteSymbols(state: EffectRenderState) {
  renderBend(state);
  renderAccent(state);
  renderTrill(state);
  renderHarmonic(state);
}

function renderBend(state: EffectRenderState) {
  const bend = state.entry.context.note.effect.bend;
  if (!bend || bend.kind === "None") {
    return;
  }

  const group = createEffectGroup(state, "bend");
  const points = bendPoints(state, bend);
  const path = createEffectPath(
    points
      .map((point, index) => {
        return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
      })
      .join(" "),
  );
  const arrow = createArrow(points);
  const labelPoint = points.reduce((highest, point) => {
    return point.y < highest.y ? point : highest;
  }, points[0]);
  const label = createEffectText(
    state,
    bendLabel(bend),
    labelPoint.x,
    labelPoint.y - constants.NOTE_EFFECT_ARROW_SIZE,
  );

  group.setAttribute("data-bend-kind", bend.kind);
  group.setAttribute("data-bend-value", `${bend.value}`);
  group.append(path, arrow, label);
  state.parent.append(group);
}

function bendPoints(state: EffectRenderState, bend: BendEffect): Point[] {
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
  const maxValue = Math.max(
    1,
    bend.max_value,
    ...source.map((point) => Math.abs(point.value)),
  );
  const effectWidth = Math.max(
    constants.NOTE_EFFECT_BEND_MIN_WIDTH,
    Math.min(constants.NOTE_EFFECT_BEND_WIDTH, width / 2),
  );
  const startX =
    noteEdgeX(state.entry, 1) + constants.NOTE_EFFECT_HORIZONTAL_OFFSET;
  const baseY = context.y - constants.NOTE_EFFECT_NOTE_GAP;

  return source.map((point) => ({
    x: startX + (point.position / maxPosition) * effectWidth,
    y: baseY - (point.value / maxValue) * constants.NOTE_EFFECT_BEND_HEIGHT,
  }));
}

function createArrow(points: Point[]): SVGPathElement {
  const end = points[points.length - 1];
  const previous = points[points.length - 2] ?? {
    x: end.x,
    y: end.y + 1,
  };
  const direction = end.y <= previous.y ? 1 : -1;
  const size = constants.NOTE_EFFECT_ARROW_SIZE;
  return createEffectPath(
    `M ${end.x - size} ${end.y + direction * size} L ${end.x} ${
      end.y
    } L ${end.x + size} ${end.y + direction * size}`,
  );
}

function bendLabel(bend: BendEffect): string {
  const semitones =
    bend.semitone_length > 0 ? Math.abs(bend.value / bend.semitone_length) : 0;
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

function renderAccent(state: EffectRenderState) {
  const effect = state.entry.context.note.effect;
  if (!effect.accentuated_note && !effect.heavy_accentuated_note) {
    return;
  }

  const { context } = state.entry;
  const group = createEffectGroup(state, "accent");
  group.append(
    createEffectText(
      state,
      effect.heavy_accentuated_note ? ">>" : ">",
      context.x,
      context.y - constants.NOTE_EFFECT_TEXT_OFFSET,
    ),
  );
  state.parent.append(group);
}

function renderTrill(state: EffectRenderState) {
  const trill = state.entry.context.note.effect.trill;
  if (!trill) {
    return;
  }

  const { context } = state.entry;
  const group = createEffectGroup(state, "trill");
  group.setAttribute("data-trill-fret", `${trill.fret}`);
  group.append(
    createEffectText(
      state,
      "tr",
      context.x + constants.NOTE_EFFECT_HORIZONTAL_OFFSET,
      context.y -
        constants.NOTE_EFFECT_TEXT_OFFSET -
        constants.NOTE_EFFECT_NOTE_GAP,
    ),
  );
  state.parent.append(group);
}

function renderHarmonic(state: EffectRenderState) {
  const harmonic = state.entry.context.note.effect.harmonic;
  if (!harmonic) {
    return;
  }

  const { context } = state.entry;
  const halfWidth = Math.max(5, context.fontSize * 0.7);
  const halfHeight = Math.max(6, context.fontSize * 0.75);
  const group = createEffectGroup(state, "harmonic");
  const diamond = createSvgElement("polygon");
  diamond.setAttribute(
    "points",
    [
      `${context.x},${context.y - halfHeight}`,
      `${context.x + halfWidth},${context.y}`,
      `${context.x},${context.y + halfHeight}`,
      `${context.x - halfWidth},${context.y}`,
    ].join(" "),
  );
  applyEffectPathDefaults(diamond);
  group.setAttribute("data-harmonic-kind", harmonic.kind);
  group.append(diamond);
  state.parent.append(group);
}
