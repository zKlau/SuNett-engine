import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type {
  EffectBeat,
  PositionedNote,
} from "../../../types/UI/noteEffectsRender";

export function collectEffectBeats(notes: PositionedNote[]): EffectBeat[] {
  const beats: EffectBeat[] = [];

  notes.forEach((note) => {
    const { context } = note;
    const existing = beats.find((beat) => {
      return (
        beat.voiceIndex === context.voiceIndex &&
        beat.beatIndex === context.beatIndex
      );
    });

    if (existing) {
      existing.notes.push(note);
      return;
    }

    beats.push({
      voiceIndex: context.voiceIndex,
      beatIndex: context.beatIndex,
      x: context.x,
      width: note.width,
      notes: [note],
    });
  });

  return beats.sort((left, right) => {
    return (
      left.voiceIndex - right.voiceIndex || left.beatIndex - right.beatIndex
    );
  });
}

export function findNextNote(
  notes: PositionedNote[],
  currentIndex: number,
): PositionedNote | undefined {
  const current = notes[currentIndex].context;
  return notes.slice(currentIndex + 1).find(({ context }) => {
    return (
      context.voiceIndex === current.voiceIndex &&
      context.beatIndex === current.beatIndex + 1 &&
      context.note.string === current.note.string
    );
  });
}

export function findPreviousNote(
  notes: PositionedNote[],
  currentIndex: number,
): PositionedNote | undefined {
  const current = notes[currentIndex].context;
  return notes
    .slice(0, currentIndex)
    .reverse()
    .find(({ context }) => {
      return (
        context.voiceIndex === current.voiceIndex &&
        context.beatIndex === current.beatIndex - 1 &&
        context.note.string === current.note.string
      );
    });
}

export function findPreviousMeasureNote(
  notes: PositionedNote[],
  current: PositionedNote,
): PositionedNote | undefined {
  return notes
    .slice()
    .reverse()
    .find(({ context }) => {
      return (
        context.voiceIndex === current.context.voiceIndex &&
        context.note.string === current.context.note.string
      );
    });
}

export function noteEdgeX(note: PositionedNote, direction: -1 | 1): number {
  return (
    note.context.x +
    direction * (note.glyphWidth / 2 + constants.NOTE_EFFECT_NOTE_GAP)
  );
}
