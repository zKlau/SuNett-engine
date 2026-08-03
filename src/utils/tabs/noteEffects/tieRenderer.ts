import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type {
  EffectRenderState,
  NoteEffectsRenderRequest,
  PositionedNote,
} from "../../../types/UI/noteEffectsRender";
import { noteCurveAnchor } from "./effectLayout";
import { createEffectGroup, createEffectPath } from "./effectSvg";

const TIE_CURVE_DIRECTION = 1;

export function renderTie(
  state: EffectRenderState,
  previous: PositionedNote | undefined,
  measureStartX: number,
) {
  const { context } = state.entry;
  if (context.note.kind !== "Tie") {
    return;
  }

  const direction = TIE_CURVE_DIRECTION;
  const end = noteCurveAnchor(state.entry, direction);
  const start = previous
    ? noteCurveAnchor(previous, direction)
    : {
        x: measureStartX,
        y: end.y,
      };
  if (end.x <= start.x) {
    return;
  }

  const group = createEffectGroup(state, "tie");
  const middleX = (start.x + end.x) / 2;
  const curveY = end.y + direction * tieCurveHeight(end.x - start.x);
  group.setAttribute("data-placement", direction < 0 ? "above" : "below");
  group.append(
    createEffectPath(
      `M ${start.x} ${start.y} Q ${middleX} ${curveY} ${end.x} ${end.y}`,
    ),
  );
  state.parent.append(group);
}

export function renderOutgoingRowTies(request: NoteEffectsRenderRequest) {
  if (!request.nextRowMeasure) {
    return;
  }

  request.notes.forEach((entry) => {
    const { context } = entry;
    const nextNote = request.nextRowMeasure?.voices[
      context.voiceIndex
    ]?.beats[0]?.notes.find((note) => {
      return note.kind === "Tie" && note.string === context.note.string;
    });
    const laterNote = request.notes.some((candidate) => {
      return (
        candidate.context.voiceIndex === context.voiceIndex &&
        candidate.context.note.string === context.note.string &&
        candidate.context.beatIndex > context.beatIndex
      );
    });
    if (!nextNote || laterNote) {
      return;
    }

    const direction = TIE_CURVE_DIRECTION;
    const start = noteCurveAnchor(entry, direction);
    const end = {
      x: request.measureEndX,
      y: start.y,
    };
    if (end.x <= start.x) {
      return;
    }

    const state: EffectRenderState = {
      parent: request.parent,
      entry,
      classPrefix: request.classPrefix,
    };
    const group = createEffectGroup(state, "tie");
    const middleX = (start.x + end.x) / 2;
    const curveY = start.y + direction * tieCurveHeight(end.x - start.x);
    group.setAttribute("data-placement", direction < 0 ? "above" : "below");
    group.append(
      createEffectPath(
        `M ${start.x} ${start.y} Q ${middleX} ${curveY} ${end.x} ${end.y}`,
      ),
    );
    request.parent.append(group);
  });
}

function tieCurveHeight(width: number): number {
  return Math.min(
    constants.NOTE_EFFECT_TIE_MAX_HEIGHT,
    Math.max(
      constants.NOTE_EFFECT_SLUR_HEIGHT,
      width * constants.NOTE_EFFECT_TIE_HEIGHT_RATIO,
    ),
  );
}
