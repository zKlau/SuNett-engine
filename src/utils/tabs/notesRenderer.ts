import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { NoteRenderContext } from "../../types/UI/noteRenderContext";
import type {
  NoteRenderRequest,
  NotesRenderRequest,
  PositionedNoteRender,
} from "../../types/UI/notesRender";
import { renderNoteEffects } from "./noteEffectsRenderer";
import {
  noteLabel,
  renderNoteElement,
  resolveGlyphWidth,
} from "./noteRendering/noteElementRenderer";
import { createNoteSvgElement } from "./noteRendering/noteSvg";
import { stringDisplayRow } from "./stringOrder";

export function renderMeasureNotes(request: NotesRenderRequest) {
  const {
    parent,
    measure,
    measureIndex,
    beatLayouts,
    bounds,
    stringCount,
    invertStrings = false,
    reverseStrings = false,
    config,
    metrics,
    previousNotes = [],
  } = request;
  const notes: NoteRenderRequest[] = [];

  beatLayouts.forEach((beatLayout) => {
    const beat =
      measure.voices[beatLayout.voiceIndex]?.beats[beatLayout.beatIndex];
    if (!beat || beat.status === "Rest") {
      return;
    }

    beat.notes.forEach((note) => {
      const noteRequest: NoteRenderRequest = {
        parent,
        measure,
        measureIndex,
        beat,
        beatLayout,
        note,
        bounds,
        stringCount,
        invertStrings,
        reverseStrings,
        config,
        metrics,
      };
      if (isRenderableNote(noteRequest)) {
        notes.push(noteRequest);
      }
    });
  });

  const positionedNotes = notes.map(positionNote);
  positionedNotes.forEach(({ request: noteRequest, context }, index) => {
    if (!isInternalTie(positionedNotes, index)) {
      renderNoteElement(noteRequest, context);
    }
  });
  renderNoteEffects({
    parent,
    notes: positionedNotes.map(({ context, width, glyphWidth }) => ({
      context,
      width,
      glyphWidth,
    })),
    classPrefix: config.classPrefix,
    spanY:
      bounds.y +
      constants.MEASURE_TOP_PADDING -
      constants.NOTE_EFFECT_SPAN_OFFSET,
    staffTop: bounds.y + constants.MEASURE_TOP_PADDING,
    previousNotes,
  });

  return positionedNotes.map(({ context, width, glyphWidth }) => ({
    context,
    width,
    glyphWidth,
  }));
}

function positionNote(request: NoteRenderRequest): PositionedNoteRender {
  const {
    measure,
    measureIndex,
    beat,
    beatLayout,
    note,
    bounds,
    stringCount,
    invertStrings,
    reverseStrings,
    config,
    metrics,
  } = request;
  const stringRow = stringDisplayRow(
    note.string,
    stringCount,
    reverseStrings,
    invertStrings,
  );
  const y =
    bounds.y + constants.MEASURE_TOP_PADDING + stringRow * bounds.stringSpacing;
  const context: NoteRenderContext = {
    note,
    beat,
    measure,
    measureIndex,
    voiceIndex: beatLayout.voiceIndex,
    beatIndex: beatLayout.beatIndex,
    x: beatLayout.x,
    y,
    fontSize: metrics.fontSize,
    createElement: createNoteSvgElement,
  };
  const glyphWidth = resolveGlyphWidth(
    noteLabel(note),
    context.fontSize,
    config,
    metrics,
  );

  return { request, context, width: beatLayout.width, glyphWidth };
}

function isInternalTie(
  notes: PositionedNoteRender[],
  currentIndex: number,
): boolean {
  const current = notes[currentIndex].context;
  if (current.note.kind !== "Tie") {
    return false;
  }
  return notes.slice(0, currentIndex).some(({ context }) => {
    return (
      context.voiceIndex === current.voiceIndex &&
      context.beatIndex === current.beatIndex - 1 &&
      context.note.string === current.note.string
    );
  });
}

function isRenderableNote(request: NoteRenderRequest): boolean {
  const { note, stringCount } = request;
  return note.kind !== "Rest" && note.string >= 0 && note.string < stringCount;
}
