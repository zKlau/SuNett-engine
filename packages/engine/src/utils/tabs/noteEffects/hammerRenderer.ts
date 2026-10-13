import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type {
  EffectRenderState,
  NoteEffectsRenderRequest,
  PositionedNote,
} from "../../../types/UI/noteEffectsRender";
import {
  findNextNote,
  noteCurveAnchor,
  noteCurveDirection,
} from "./effectLayout";
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

export function renderHammer(
  state: EffectRenderState,
  notes: PositionedNote[],
) {
  if (!state.entry.context.note.effect.hammer || !state.next) {
    return;
  }

  const { context } = state.entry;
  const nextContext = state.next.context;
  const direction = noteCurveDirection(notes, state.entry);
  const start = noteCurveAnchor(state.entry, direction);
  const end = noteCurveAnchor(state.next, direction);
  if (end.x <= start.x) {
    return;
  }

  const group = createEffectGroup(state, "hammer");
  const middleX = (start.x + end.x) / 2;
  const curveY =
    direction < 0
      ? Math.min(start.y, end.y) - constants.NOTE_EFFECT_SLUR_HEIGHT
      : Math.max(start.y, end.y) + constants.NOTE_EFFECT_SLUR_HEIGHT;
  const path = createEffectPath(
    `M ${start.x} ${start.y} Q ${middleX} ${curveY} ${end.x} ${end.y}`,
  );
  const symbol = nextContext.note.value > context.note.value ? "h" : "p";

  group.setAttribute("data-technique", symbol);
  group.setAttribute("data-placement", direction < 0 ? "above" : "below");
  group.append(path);
  state.parent.append(group);
}

function renderHammerPhrase(
  request: NoteEffectsRenderRequest,
  phrase: PositionedNote[],
) {
  const first = phrase[0];
  const last = phrase[phrase.length - 1];
  const direction = noteCurveDirection(request.notes, first);
  const start = noteCurveAnchor(first, direction);
  const end = noteCurveAnchor(last, direction);
  if (end.x <= start.x) {
    return;
  }

  const middleX = (start.x + end.x) / 2;
  const curveY =
    direction < 0
      ? Math.min(start.y, end.y) - constants.NOTE_EFFECT_PHRASE_SLUR_HEIGHT
      : Math.max(start.y, end.y) + constants.NOTE_EFFECT_PHRASE_SLUR_HEIGHT;
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
  group.setAttribute("data-placement", direction < 0 ? "above" : "below");
  group.setAttribute("data-target-beat", `${last.context.beatIndex}`);
  group.setAttribute(
    "data-tuplet",
    `${first.context.beat.duration.tuplet_enters}`,
  );
  group.append(
    createEffectPath(
      `M ${start.x} ${start.y} Q ${middleX} ${curveY} ${end.x} ${end.y}`,
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
