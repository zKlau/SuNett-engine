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
import { renderTie } from "./noteEffects/tieRenderer";

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

    if (!phraseHammerSources.has(entry)) {
      renderHammer(state);
    }
    renderTie(
      state,
      findPreviousNote(request.notes, index) ??
        findPreviousMeasureNote(request.previousNotes ?? [], entry),
    );
    renderNoteSymbols(state);
    renderSlides(state);
  });
}
