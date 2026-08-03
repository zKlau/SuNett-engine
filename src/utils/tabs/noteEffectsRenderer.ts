import type {
  EffectRenderState,
  NoteEffectsRenderRequest,
} from "../../types/UI/noteEffectsRender";
import {
  findNextNote,
  findPreviousMeasureNote,
  findPreviousNote,
} from "./noteEffects/effectLayout";
import {
  renderBeatStaccato,
  renderBeatVibrato,
} from "./noteEffects/beatTechniqueRenderer";
import {
  renderHammer,
  renderHammerPhrases,
} from "./noteEffects/hammerRenderer";
import { renderNoteSymbols } from "./noteEffects/noteSymbolRenderer";
import {
  renderLegatoSlideSlurs,
  renderSlides,
} from "./noteEffects/slideRenderer";
import { renderTechniqueSpans } from "./noteEffects/techniqueSpanRenderer";
import { renderOutgoingRowTies, renderTie } from "./noteEffects/tieRenderer";

export function renderNoteEffects(request: NoteEffectsRenderRequest) {
  renderTechniqueSpans(request);
  renderBeatStaccato(request);
  renderBeatVibrato(request);
  renderLegatoSlideSlurs(request);
  const phraseHammerSources = renderHammerPhrases(request);

  request.notes.forEach((entry, index) => {
    if (!entry.context.note.effect) {
      return;
    }

    const state: EffectRenderState = {
      parent: request.parent,
      entry,
      next: findNextNote(request.notes, index),
      classPrefix: request.classPrefix,
    };
    const previous =
      findPreviousNote(request.notes, index) ??
      findPreviousMeasureNote(request.previousNotes ?? [], entry);

    if (!phraseHammerSources.has(entry)) {
      renderHammer(state, request.notes);
    }
    renderTie(state, previous, request.measureStartX);
    const inheritedBend =
      entry.context.note.kind === "Tie" && previous?.deferBend
        ? (previous.context.note.effect.bend ?? undefined)
        : undefined;
    renderNoteSymbols(state, inheritedBend);
    renderSlides(state);
  });
  renderOutgoingRowTies(request);
}
