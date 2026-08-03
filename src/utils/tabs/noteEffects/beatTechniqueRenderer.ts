import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import { BravuraNotationGlyphs } from "../../../constants/notationGlyphPaths";
import { ThemeVariables, themeVar } from "../../../theme/variables";
import type {
  EffectRenderState,
  NoteEffectsRenderRequest,
} from "../../../types/UI/noteEffectsRender";
import { collectEffectBeats } from "./effectLayout";
import { createEffectGroup, createSvgElement } from "./effectSvg";
import { createNotationGlyph } from "./notationGlyphRenderer";

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
    const state: EffectRenderState = {
      parent: request.parent,
      entry: affectedNotes[0],
      classPrefix: request.classPrefix,
    };
    const group = createEffectGroup(state, "vibrato");
    appendGuitarShake(group, startX, endX, y);
    request.parent.append(group);
  });
}

function appendGuitarShake(
  parent: SVGGElement,
  startX: number,
  endX: number,
  y: number,
) {
  const glyph = BravuraNotationGlyphs.GUITAR_SHAKE;
  const availableWidth = endX - startX;
  const scale = Math.min(
    constants.NOTE_EFFECT_GUITAR_SHAKE_SCALE,
    availableWidth / glyph.width,
  );
  const segmentWidth = glyph.width * scale;
  const count = Math.max(1, Math.floor(availableWidth / segmentWidth));
  const renderedWidth = count * segmentWidth;
  const offset = (availableWidth - renderedWidth) / 2;

  for (let index = 0; index < count; index += 1) {
    parent.append(
      createNotationGlyph(
        glyph,
        startX + offset + segmentWidth * (index + 0.5),
        y,
        scale,
        ThemeVariables.COLOR_MUTED,
      ),
    );
  }
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
