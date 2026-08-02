import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type {
  EffectRenderState,
  NoteEffectsRenderRequest,
  PositionedNote,
} from "../../../types/UI/noteEffectsRender";
import { findNextNote, noteEdgeX } from "./effectLayout";
import { createEffectGroup, createEffectPath } from "./effectSvg";

export function renderHammerPhrases(
  request: NoteEffectsRenderRequest,
): Set<PositionedNote> {
  const sources = new Set<PositionedNote>();
  const handled = new Set<PositionedNote>();

  request.notes.forEach((entry, index) => {
    if (handled.has(entry) || tupletKey(entry) === "") {
      return;
    }

    const phrase = [entry];
    const key = tupletKey(entry);
    let source = entry;
    let sourceIndex = index;

    while (source.context.note.effect.hammer) {
      const next = findNextNote(request.notes, sourceIndex);
      if (!next || tupletKey(next) !== key) {
        break;
      }
      phrase.push(next);
      source = next;
      sourceIndex = request.notes.indexOf(next);
    }

    if (phrase.length < 3) {
      return;
    }

    phrase.forEach((note) => {
      handled.add(note);
    });
    phrase.slice(0, -1).forEach((note) => {
      sources.add(note);
    });
    renderHammerPhrase(request, phrase);
  });

  return sources;
}

export function renderHammer(state: EffectRenderState) {
  if (!state.entry.context.note.effect.hammer || !state.next) {
    return;
  }

  const { context } = state.entry;
  const nextContext = state.next.context;
  const startX = noteEdgeX(state.entry, 1);
  const endX = noteEdgeX(state.next, -1);
  if (endX <= startX) {
    return;
  }

  const group = createEffectGroup(state, "hammer");
  const y = context.y - constants.NOTE_EFFECT_NOTE_GAP;
  const middleX = (startX + endX) / 2;
  const path = createEffectPath(
    `M ${startX} ${y} Q ${middleX} ${
      y - constants.NOTE_EFFECT_SLUR_HEIGHT
    } ${endX} ${y}`,
  );
  const symbol = nextContext.note.value > context.note.value ? "h" : "p";

  group.setAttribute("data-technique", symbol);
  group.append(path);
  state.parent.append(group);
}

function renderHammerPhrase(
  request: NoteEffectsRenderRequest,
  phrase: PositionedNote[],
) {
  const first = phrase[0];
  const last = phrase[phrase.length - 1];
  const startX = noteEdgeX(first, 1);
  const endX = noteEdgeX(last, -1);
  if (endX <= startX) {
    return;
  }

  const startY = first.context.y - constants.NOTE_EFFECT_NOTE_GAP;
  const endY = last.context.y - constants.NOTE_EFFECT_NOTE_GAP;
  const middleX = (startX + endX) / 2;
  const curveY =
    Math.min(startY, endY) - constants.NOTE_EFFECT_PHRASE_SLUR_HEIGHT;
  const state: EffectRenderState = {
    parent: request.parent,
    entry: first,
    classPrefix: request.classPrefix,
  };
  const group = createEffectGroup(state, "hammer");
  const techniques = phrase.slice(0, -1).map((note, index) => {
    return phrase[index + 1].context.note.value > note.context.note.value
      ? "h"
      : "p";
  });

  group.setAttribute("data-technique", techniques.join("-"));
  group.setAttribute("data-target-beat", `${last.context.beatIndex}`);
  group.setAttribute(
    "data-tuplet",
    `${first.context.beat.duration.tuplet_enters}`,
  );
  group.append(
    createEffectPath(
      `M ${startX} ${startY} Q ${middleX} ${curveY} ${endX} ${endY}`,
    ),
  );
  request.parent.append(group);
}

function tupletKey(note: PositionedNote): string {
  const { duration } = note.context.beat;
  if (duration.tuplet_enters <= 1) {
    return "";
  }
  return `${duration.tuplet_enters}:${duration.tuplet_times}`;
}
