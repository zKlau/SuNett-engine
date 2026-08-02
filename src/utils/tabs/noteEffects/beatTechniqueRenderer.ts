import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../../theme/variables";
import type {
  EffectRenderState,
  NoteEffectsRenderRequest,
} from "../../../types/UI/noteEffectsRender";
import { collectEffectBeats } from "./effectLayout";
import {
  createEffectGroup,
  createMutedEffectPath,
  createSvgElement,
} from "./effectSvg";

export function renderBeatVibrato(request: NoteEffectsRenderRequest) {
  collectEffectBeats(request.notes).forEach((beat) => {
    const affectedNotes = beat.notes.filter(({ context }) => {
      return context.note.effect.vibrato;
    });
    if (affectedNotes.length === 0) {
      return;
    }

    const startX = Math.min(
      ...affectedNotes.map((note) => {
        return note.context.x - note.glyphWidth / 2;
      }),
    );
    const endX = beat.x + beat.width / 2 - constants.NOTE_EFFECT_NOTE_GAP;
    if (endX <= startX) {
      return;
    }

    const y = request.staffTop - constants.NOTE_EFFECT_VIBRATO_OFFSET;
    const points: string[] = [`M ${startX} ${y}`];
    let offset = constants.NOTE_EFFECT_WAVE_STEP;

    while (startX + offset < endX) {
      const waveY =
        y +
        ((offset / constants.NOTE_EFFECT_WAVE_STEP) % 2) *
          constants.NOTE_EFFECT_WAVE_HEIGHT *
          2 -
        constants.NOTE_EFFECT_WAVE_HEIGHT;
      points.push(`L ${startX + offset} ${waveY}`);
      offset += constants.NOTE_EFFECT_WAVE_STEP;
    }
    points.push(`L ${endX} ${y}`);

    const state: EffectRenderState = {
      parent: request.parent,
      entry: affectedNotes[0],
      classPrefix: request.classPrefix,
    };
    const group = createEffectGroup(state, "vibrato");
    group.append(createMutedEffectPath(points.join(" ")));
    request.parent.append(group);
  });
}

export function renderBeatStaccato(request: NoteEffectsRenderRequest) {
  collectEffectBeats(request.notes).forEach((beat) => {
    if (!beat.notes.some(({ context }) => context.note.effect.staccato)) {
      return;
    }

    const state: EffectRenderState = {
      parent: request.parent,
      entry: beat.notes[0],
      classPrefix: request.classPrefix,
    };
    const group = createEffectGroup(state, "staccato");
    const circle = createSvgElement("circle");
    circle.setAttribute("cx", `${beat.x}`);
    circle.setAttribute(
      "cy",
      `${request.staffTop - constants.NOTE_EFFECT_STACCATO_OFFSET}`,
    );
    circle.setAttribute("r", `${constants.NOTE_EFFECT_DOT_RADIUS}`);
    circle.setAttribute("fill", themeVar(ThemeVariables.COLOR_MUTED));
    circle.setAttribute("stroke", "none");
    group.append(circle);
    request.parent.append(group);
  });
}
