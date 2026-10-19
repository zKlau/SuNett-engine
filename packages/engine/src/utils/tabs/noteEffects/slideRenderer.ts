import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type {
  EffectRenderState,
  NoteEffectsRenderRequest,
} from "../../../types/UI/noteEffectsRender";
import {
  collectEffectBeats,
  noteCurveAnchor,
  noteCurveDirection,
  noteEdgeX,
} from "./effectLayout";
import { createEffectGroup, createEffectPath } from "./effectSvg";

const INCOMING_SLIDES = new Set(["IntoFromAbove", "IntoFromBelow"]);
const OUTGOING_SLIDES = new Set(["OutDownwards", "OutUpWards"]);

export function renderLegatoSlideSlurs(request: NoteEffectsRenderRequest) {
  const beats = collectEffectBeats(request.notes);

  beats.forEach((beat, index) => {
    const sources = beat.notes.filter(({ context }) => {
      return context.note.effect.slides.includes("LegatoSlideTo");
    });
    if (sources.length === 0) {
      return;
    }

    const targetBeat = beats.slice(index + 1).find((candidate) => {
      return (
        candidate.voiceIndex === beat.voiceIndex &&
        candidate.notes.some((target) => {
          return sources.some((source) => {
            return source.context.note.string === target.context.note.string;
          });
        })
      );
    });
    if (!targetBeat) {
      return;
    }

    const source = sources
      .filter((candidate) => {
        return targetBeat.notes.some((target) => {
          return target.context.note.string === candidate.context.note.string;
        });
      })
      .sort((left, right) => left.context.y - right.context.y)[0];
    const target = targetBeat.notes.find((candidate) => {
      return candidate.context.note.string === source.context.note.string;
    });
    if (!target) {
      return;
    }

    const direction = noteCurveDirection(request.notes, source);
    const start = noteCurveAnchor(source, direction);
    const end = noteCurveAnchor(target, direction);
    if (end.x <= start.x) {
      return;
    }

    const middleX = (start.x + end.x) / 2;
    const curveY =
      direction < 0
        ? Math.min(start.y, end.y) - constants.NOTE_EFFECT_SLUR_HEIGHT
        : Math.max(start.y, end.y) + constants.NOTE_EFFECT_SLUR_HEIGHT;
    const state: EffectRenderState = {
      parent: request.parent,
      entry: source,
      classPrefix: request.classPrefix,
    };
    const group = createEffectGroup(state, "legato-slide");
    group.setAttribute("data-target-beat", `${targetBeat.beatIndex}`);
    group.append(
      createEffectPath(
        `M ${start.x} ${start.y} Q ${middleX} ${curveY} ${end.x} ${end.y}`,
      ),
    );
    request.parent.append(group);
  });
}

export function renderSlides(
  state: EffectRenderState,
  request: NoteEffectsRenderRequest,
) {
  state.entry.context.note.effect.slides.forEach((slide, index) => {
    const pathData = slidePath(state, slide, index, request);
    if (!pathData) {
      return;
    }

    const group = createEffectGroup(state, "slide");
    group.setAttribute("data-slide-type", slide);
    group.append(createEffectPath(pathData));
    state.parent.append(group);
  });
}

function slidePath(
  state: EffectRenderState,
  slide: string,
  index: number,
  request: NoteEffectsRenderRequest,
): string | undefined {
  const { context } = state.entry;
  const height =
    constants.NOTE_EFFECT_SLIDE_HEIGHT +
    index * constants.NOTE_EFFECT_STROKE_WIDTH;
  const leftEdge = noteEdgeX(state.entry, -1);
  const rightEdge = noteEdgeX(state.entry, 1);

  if (INCOMING_SLIDES.has(slide)) {
    const length = slideLength(state, request, -1, height);
    if (length <= 0) {
      return undefined;
    }
    const offset = slide === "IntoFromAbove" ? -height : height;
    return `M ${leftEdge - length} ${context.y + offset} L ${leftEdge} ${context.y}`;
  }
  if (OUTGOING_SLIDES.has(slide)) {
    const length = slideLength(state, request, 1, height);
    if (length <= 0) {
      return undefined;
    }
    const offset = slide === "OutDownwards" ? height : -height;
    return `M ${rightEdge} ${context.y} L ${rightEdge + length} ${context.y + offset}`;
  }
  if ((slide === "ShiftSlideTo" || slide === "LegatoSlideTo") && state.next) {
    const endX = noteEdgeX(state.next, -1);
    if (endX <= rightEdge) {
      return undefined;
    }
    const direction =
      state.next.displayValue >= state.entry.displayValue ? 1 : -1;
    return `M ${rightEdge} ${context.y + direction * (height / 2)} L ${endX} ${
      state.next.context.y - direction * (height / 2)
    }`;
  }
  return undefined;
}

function slideLength(
  state: EffectRenderState,
  request: NoteEffectsRenderRequest,
  direction: -1 | 1,
  height: number,
): number {
  const { entry } = state;
  const anchorX = noteEdgeX(entry, direction);
  const boundary = direction < 0 ? request.measureStartX : request.measureEndX;
  let length = Math.min(
    constants.NOTE_EFFECT_LINE_LENGTH,
    entry.width / 2,
    direction * (boundary - anchorX) - constants.NOTE_EFFECT_NOTE_GAP,
  );
  const complementarySlides = direction < 0 ? OUTGOING_SLIDES : INCOMING_SLIDES;

  request.notes.forEach((candidate) => {
    if (
      direction * (candidate.context.x - entry.context.x) <= 0 ||
      Math.abs(candidate.context.y - entry.context.y) >
        height + candidate.glyphHeight / 2 + constants.NOTE_EFFECT_NOTE_GAP
    ) {
      return;
    }
    const gap =
      direction * (noteEdgeX(candidate, direction === 1 ? -1 : 1) - anchorX);
    if (candidate.labelVisible !== false) {
      length = Math.min(length, gap);
    }
    if (
      candidate.context.voiceIndex === entry.context.voiceIndex &&
      candidate.context.beatIndex === entry.context.beatIndex + direction &&
      candidate.context.note.effect.slides.some((slide) =>
        complementarySlides.has(slide),
      )
    ) {
      length = Math.min(
        length,
        (gap - constants.NOTE_EFFECT_SLIDE_PAIR_GAP) / 2,
      );
    }
  });
  return Math.max(0, length);
}
