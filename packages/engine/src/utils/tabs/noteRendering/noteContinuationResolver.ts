import type {
  NotesRenderRequest,
  PositionedNoteRender,
} from "../../../types/UI/notesRender";
import {
  findNextNote,
  findPreviousMeasureNote,
  findPreviousNote,
} from "../noteEffects/effectLayout";
import { noteLabel, resolveGlyphWidth } from "./noteElementRenderer";

export function resolveNoteContinuations(
  notes: PositionedNoteRender[],
  request: NotesRenderRequest,
): PositionedNoteRender[] {
  return notes.reduce<PositionedNoteRender[]>((resolved, entry, index) => {
    const previous =
      findPreviousNote([...resolved, entry], index) ??
      findPreviousMeasureNote(
        request.previousMeasureNotes ?? request.previousNotes ?? [],
        entry,
      );
    const displayValue =
      entry.context.note.kind === "Tie"
        ? (previous?.displayValue ??
          previous?.context.note.value ??
          entry.context.note.value)
        : entry.context.note.value;
    const label = noteLabel(
      entry.context.note,
      entry.context.note.kind === "Tie" ? displayValue : undefined,
    );
    const next = findNextNote(notes, index);
    const nextMeasureNote = request.nextMeasure?.voices[
      entry.context.voiceIndex
    ]?.beats[0]?.notes.find((note) => {
      return note.string === entry.context.note.string;
    });
    const bend = entry.context.note.effect.bend;
    const deferBend = Boolean(
      bend &&
      bend.kind !== "None" &&
      (next?.context.note.kind === "Tie" || nextMeasureNote?.kind === "Tie"),
    );

    resolved.push({
      ...entry,
      label,
      displayValue,
      glyphWidth: resolveGlyphWidth(
        label,
        entry.context.fontSize,
        request.config,
        request.metrics,
      ),
      deferBend,
    });
    return resolved;
  }, []);
}
