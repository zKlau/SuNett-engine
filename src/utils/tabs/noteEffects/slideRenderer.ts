import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type {
  EffectRenderState,
  NoteEffectsRenderRequest,
} from "../../../types/UI/noteEffectsRender";
import { collectEffectBeats, noteEdgeX } from "./effectLayout";
import { createEffectGroup, createEffectPath } from "./effectSvg";

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

    const startX = noteEdgeX(source, 1);
    const endX = noteEdgeX(target, -1);
    if (endX <= startX) {
      return;
    }

    const startY = source.context.y - constants.NOTE_EFFECT_NOTE_GAP;
    const endY = target.context.y - constants.NOTE_EFFECT_NOTE_GAP;
    const middleX = (startX + endX) / 2;
    const curveY = Math.min(startY, endY) - constants.NOTE_EFFECT_SLUR_HEIGHT;
    const state: EffectRenderState = {
      parent: request.parent,
      entry: source,
      classPrefix: request.classPrefix,
    };
    const group = createEffectGroup(state, "legato-slide");
    group.setAttribute("data-target-beat", `${targetBeat.beatIndex}`);
    group.append(
      createEffectPath(
        `M ${startX} ${startY} Q ${middleX} ${curveY} ${endX} ${endY}`,
      ),
    );
    request.parent.append(group);
  });
}

export function renderSlides(state: EffectRenderState) {
  state.entry.context.note.effect.slides.forEach((slide, index) => {
    const pathData = slidePath(state, slide, index);
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
): string | undefined {
  const { context, width } = state.entry;
  const height =
    constants.NOTE_EFFECT_SLIDE_HEIGHT +
    index * constants.NOTE_EFFECT_STROKE_WIDTH;
  const length = Math.min(constants.NOTE_EFFECT_LINE_LENGTH, width / 2);
  const leftEdge = noteEdgeX(state.entry, -1);
  const rightEdge = noteEdgeX(state.entry, 1);

  if (slide === "IntoFromAbove") {
    return `M ${leftEdge - length} ${
      context.y - height
    } L ${leftEdge} ${context.y}`;
  }
  if (slide === "IntoFromBelow") {
    return `M ${leftEdge - length} ${
      context.y + height
    } L ${leftEdge} ${context.y}`;
  }
  if (slide === "OutDownwards") {
    return `M ${rightEdge} ${context.y} L ${rightEdge + length} ${
      context.y + height
    }`;
  }
  if (slide === "OutUpWards") {
    return `M ${rightEdge} ${context.y} L ${rightEdge + length} ${
      context.y - height
    }`;
  }
  if ((slide === "ShiftSlideTo" || slide === "LegatoSlideTo") && state.next) {
    const direction =
      state.next.context.note.value >= context.note.value ? 1 : -1;
    return `M ${rightEdge} ${
      context.y + direction * (height / 2)
    } L ${noteEdgeX(state.next, -1)} ${
      state.next.context.y - direction * (height / 2)
    }`;
  }
  return undefined;
}
