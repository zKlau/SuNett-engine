import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type {
  EffectBeat,
  EffectRenderState,
  EffectSpan,
  NoteEffectsRenderRequest,
  PositionedNote,
  SpanRenderConfig,
} from "../../../types/UI/noteEffectsRender";
import { collectEffectBeats } from "./effectLayout";
import {
  createEffectGroup,
  createMutedEffectPath,
  createSpanText,
  effectFontSize,
} from "./effectSvg";

export function renderTechniqueSpans(request: NoteEffectsRenderRequest) {
  const configs: SpanRenderConfig[] = [
    {
      effect: "palm-mute",
      label: "P. M.",
      active: ({ context }) => context.note.effect.palm_mute,
      lineOnSingle: false,
    },
    {
      effect: "let-ring",
      label: "let ring",
      active: ({ context }) => context.note.effect.let_ring,
      lineOnSingle: true,
    },
  ];

  configs.forEach((config, lane) => {
    const spans = collectEffectSpans(request.notes, config.active);
    spans.forEach((span) => {
      renderTechniqueSpan(request, config, span, lane);
    });
  });
}

function collectEffectSpans(
  notes: PositionedNote[],
  active: SpanRenderConfig["active"],
): EffectSpan[] {
  const beats = collectEffectBeats(notes);
  const spans: EffectSpan[] = [];
  const voices = Array.from(new Set(beats.map((beat) => beat.voiceIndex)));

  voices.forEach((voiceIndex) => {
    const voiceBeats = beats.filter((beat) => beat.voiceIndex === voiceIndex);
    let start: EffectBeat | undefined;
    let end: EffectBeat | undefined;

    voiceBeats.forEach((beat) => {
      const isActive = beat.notes.some(active);
      const isConsecutive =
        end !== undefined && beat.beatIndex === end.beatIndex + 1;

      if (!isActive) {
        appendSpan(spans, start, end);
        start = undefined;
        end = undefined;
        return;
      }

      if (!start || !isConsecutive) {
        appendSpan(spans, start, end);
        start = beat;
      }
      end = beat;
    });

    appendSpan(spans, start, end);
  });

  return spans;
}

function appendSpan(
  spans: EffectSpan[],
  start: EffectBeat | undefined,
  end: EffectBeat | undefined,
) {
  if (start && end) {
    spans.push({ start, end });
  }
}

function renderTechniqueSpan(
  request: NoteEffectsRenderRequest,
  config: SpanRenderConfig,
  span: EffectSpan,
  lane: number,
) {
  const context = span.start.notes[0].context;
  const state: EffectRenderState = {
    parent: request.parent,
    entry: span.start.notes[0],
    classPrefix: request.classPrefix,
  };
  const group = createEffectGroup(state, config.effect);
  const fontSize = effectFontSize(context.fontSize);
  const y =
    request.spanY +
    lane *
      (constants.NOTE_EFFECT_TEXT_OFFSET +
        constants.NOTE_EFFECT_SPAN_END_CAP_HEIGHT);
  const labelWidth =
    config.label.length *
    fontSize *
    constants.NOTE_EFFECT_SPAN_LABEL_WIDTH_RATIO;
  const startX = span.start.x - labelWidth / 2;
  const label = createSpanText(config.label, startX, y, fontSize);
  const isSingle = span.start === span.end;

  group.setAttribute("data-start-beat", `${span.start.beatIndex}`);
  group.setAttribute("data-end-beat", `${span.end.beatIndex}`);
  group.append(label);

  if (!isSingle || config.lineOnSingle) {
    const lineStart =
      startX + labelWidth + constants.NOTE_EFFECT_SPAN_LABEL_GAP;
    const lineEnd = Math.max(
      lineStart + constants.NOTE_EFFECT_DASH_LENGTH,
      span.end.x + span.end.width / 2,
    );
    const line = createMutedEffectPath(`M ${lineStart} ${y} H ${lineEnd}`);
    line.setAttribute(
      "stroke-dasharray",
      `${constants.NOTE_EFFECT_DASH_LENGTH} ${constants.NOTE_EFFECT_DASH_GAP}`,
    );
    const cap = createMutedEffectPath(
      `M ${lineEnd} ${
        y - constants.NOTE_EFFECT_SPAN_END_CAP_HEIGHT / 2
      } V ${y + constants.NOTE_EFFECT_SPAN_END_CAP_HEIGHT / 2}`,
    );
    group.append(line, cap);
  }

  request.parent.append(group);
}
