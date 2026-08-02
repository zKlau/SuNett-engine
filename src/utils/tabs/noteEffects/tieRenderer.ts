import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type {
  EffectRenderState,
  PositionedNote,
} from "../../../types/UI/noteEffectsRender";
import { noteEdgeX } from "./effectLayout";
import { createEffectGroup, createEffectPath } from "./effectSvg";

export function renderTie(
  state: EffectRenderState,
  previous: PositionedNote | undefined,
) {
  const { context, width } = state.entry;
  if (context.note.kind !== "Tie") {
    return;
  }

  const endX = noteEdgeX(state.entry, -1);
  const startX = previous ? noteEdgeX(previous, 1) : context.x - width / 2;
  if (endX <= startX) {
    return;
  }

  const group = createEffectGroup(state, "tie");
  const y = context.y - constants.NOTE_EFFECT_NOTE_GAP;
  const middleX = (startX + endX) / 2;
  group.append(
    createEffectPath(
      `M ${startX} ${y} Q ${middleX} ${
        y + constants.NOTE_EFFECT_SLUR_HEIGHT
      } ${endX} ${y}`,
    ),
  );
  state.parent.append(group);
}
