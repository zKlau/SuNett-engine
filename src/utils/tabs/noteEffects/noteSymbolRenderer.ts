import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type { BendEffect } from "../../../types/notes/effects/bend";
import type { EffectRenderState } from "../../../types/UI/noteEffectsRender";
import {
  applyEffectPathDefaults,
  createEffectGroup,
  createEffectText,
  createSvgElement,
} from "./effectSvg";
import { renderBend } from "./bendRenderer";

export function renderNoteSymbols(
  state: EffectRenderState,
  inheritedBend?: BendEffect,
) {
  renderBend(state, inheritedBend);
  renderAccent(state);
  renderTrill(state);
  renderHarmonic(state);
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
