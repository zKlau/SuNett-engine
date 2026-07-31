import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../theme/variables";
import type { BendEffect } from "../../types/notes/effects/bend";
import type {
  EffectBeat,
  EffectRenderState,
  EffectSpan,
  NoteEffectsRenderRequest,
  PositionedNote,
  SpanRenderConfig,
} from "../../types/UI/noteEffectsRender";

type Point = {
  x: number;
  y: number;
};

export function renderNoteEffects(request: NoteEffectsRenderRequest) {
  renderTechniqueSpans(request);
  renderBeatStaccato(request);
  renderBeatVibrato(request);
  renderLegatoSlideSlurs(request);
  const phraseHammerSources = renderHammerPhrases(request);

  request.notes.forEach((entry, index) => {
    const effect = entry.context.note.effect;
    if (!effect) {
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
    renderBend(state);
    renderAccent(state);
    renderTrill(state);
    renderHarmonic(state);
    renderSlides(state);
  });
}

function renderHammerPhrases(
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
    createPath(`M ${startX} ${startY} Q ${middleX} ${curveY} ${endX} ${endY}`),
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

function renderBeatVibrato(request: NoteEffectsRenderRequest) {
  collectEffectBeats(request.notes).forEach((beat) => {
    const affectedNotes = beat.notes.filter(({ context }) => {
      return context.note.effect.vibrato;
    });
    if (affectedNotes.length === 0) {
      return;
    }

    const startX = Math.min(
      ...affectedNotes.map((note) => {
        return note.context.x - note.glyphWidth / 2;
      }),
    );
    const endX = beat.x + beat.width / 2 - constants.NOTE_EFFECT_NOTE_GAP;
    if (endX <= startX) {
      return;
    }

    const y = request.staffTop - constants.NOTE_EFFECT_VIBRATO_OFFSET;
    const points: string[] = [`M ${startX} ${y}`];
    let offset = constants.NOTE_EFFECT_WAVE_STEP;

    while (startX + offset < endX) {
      const waveY =
        y +
        ((offset / constants.NOTE_EFFECT_WAVE_STEP) % 2) *
          constants.NOTE_EFFECT_WAVE_HEIGHT *
          2 -
        constants.NOTE_EFFECT_WAVE_HEIGHT;
      points.push(`L ${startX + offset} ${waveY}`);
      offset += constants.NOTE_EFFECT_WAVE_STEP;
    }
    points.push(`L ${endX} ${y}`);

    const state: EffectRenderState = {
      parent: request.parent,
      entry: affectedNotes[0],
      classPrefix: request.classPrefix,
    };
    const group = createEffectGroup(state, "vibrato");
    group.append(createMutedPath(points.join(" ")));
    request.parent.append(group);
  });
}

function renderLegatoSlideSlurs(request: NoteEffectsRenderRequest) {
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
      createPath(
        `M ${startX} ${startY} Q ${middleX} ${curveY} ${endX} ${endY}`,
      ),
    );
    request.parent.append(group);
  });
}

function renderBeatStaccato(request: NoteEffectsRenderRequest) {
  collectEffectBeats(request.notes).forEach((beat) => {
    if (!beat.notes.some(({ context }) => context.note.effect.staccato)) {
      return;
    }

    const state: EffectRenderState = {
      parent: request.parent,
      entry: beat.notes[0],
      classPrefix: request.classPrefix,
    };
    const group = createEffectGroup(state, "staccato");
    const circle = createSvgElement("circle");
    circle.setAttribute("cx", `${beat.x}`);
    circle.setAttribute(
      "cy",
      `${request.staffTop - constants.NOTE_EFFECT_STACCATO_OFFSET}`,
    );
    circle.setAttribute("r", `${constants.NOTE_EFFECT_DOT_RADIUS}`);
    circle.setAttribute("fill", themeVar(ThemeVariables.COLOR_MUTED));
    circle.setAttribute("stroke", "none");
    group.append(circle);
    request.parent.append(group);
  });
}

function renderTechniqueSpans(request: NoteEffectsRenderRequest) {
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

function collectEffectBeats(notes: PositionedNote[]): EffectBeat[] {
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
    const line = createMutedPath(`M ${lineStart} ${y} H ${lineEnd}`);
    line.setAttribute(
      "stroke-dasharray",
      `${constants.NOTE_EFFECT_DASH_LENGTH} ${constants.NOTE_EFFECT_DASH_GAP}`,
    );
    const cap = createMutedPath(
      `M ${lineEnd} ${
        y - constants.NOTE_EFFECT_SPAN_END_CAP_HEIGHT / 2
      } V ${y + constants.NOTE_EFFECT_SPAN_END_CAP_HEIGHT / 2}`,
    );
    group.append(line, cap);
  }

  request.parent.append(group);
}

function findNextNote(
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

function findPreviousNote(
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

function findPreviousMeasureNote(
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

function renderHammer(state: EffectRenderState) {
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
  const path = createPath(
    `M ${startX} ${y} Q ${middleX} ${
      y - constants.NOTE_EFFECT_SLUR_HEIGHT
    } ${endX} ${y}`,
  );
  const symbol = nextContext.note.value > context.note.value ? "h" : "p";

  group.setAttribute("data-technique", symbol);
  group.append(path);
  state.parent.append(group);
}

function renderTie(
  state: EffectRenderState,
  previous: PositionedNote | undefined,
) {
  const { context, width } = state.entry;
  if (context.note.kind !== "Tie") {
    return;
  }

  const endX = noteEdgeX(state.entry, -1);
  const startX = previous ? noteEdgeX(previous, 1) : context.x - width / 2;
  if (endX <= startX) {
    return;
  }

  const group = createEffectGroup(state, "tie");
  const y = context.y - constants.NOTE_EFFECT_NOTE_GAP;
  const middleX = (startX + endX) / 2;
  group.append(
    createPath(
      `M ${startX} ${y} Q ${middleX} ${
        y + constants.NOTE_EFFECT_SLUR_HEIGHT
      } ${endX} ${y}`,
    ),
  );
  state.parent.append(group);
}

function renderBend(state: EffectRenderState) {
  const bend = state.entry.context.note.effect.bend;
  if (!bend || bend.kind === "None") {
    return;
  }

  const group = createEffectGroup(state, "bend");
  const points = bendPoints(state, bend);
  const path = createPath(
    points
      .map((point, index) => {
        return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
      })
      .join(" "),
  );
  const arrow = createArrow(points);
  const labelPoint = points.reduce((highest, point) => {
    return point.y < highest.y ? point : highest;
  }, points[0]);
  const label = createText(
    state,
    bendLabel(bend),
    labelPoint.x,
    labelPoint.y - constants.NOTE_EFFECT_ARROW_SIZE,
  );

  group.setAttribute("data-bend-kind", bend.kind);
  group.setAttribute("data-bend-value", `${bend.value}`);
  group.append(path, arrow, label);
  state.parent.append(group);
}

function bendPoints(state: EffectRenderState, bend: BendEffect): Point[] {
  const { context, width } = state.entry;
  const source =
    bend.points.length > 0
      ? bend.points
      : [
          { position: 0, value: 0, vibrato: false },
          {
            position: bend.max_position || 1,
            value: bend.max_value || bend.value || 1,
            vibrato: false,
          },
        ];
  const maxPosition = Math.max(
    1,
    bend.max_position,
    ...source.map((point) => point.position),
  );
  const maxValue = Math.max(
    1,
    bend.max_value,
    ...source.map((point) => Math.abs(point.value)),
  );
  const effectWidth = Math.max(
    constants.NOTE_EFFECT_BEND_MIN_WIDTH,
    Math.min(constants.NOTE_EFFECT_BEND_WIDTH, width / 2),
  );
  const startX =
    noteEdgeX(state.entry, 1) + constants.NOTE_EFFECT_HORIZONTAL_OFFSET;
  const baseY = context.y - constants.NOTE_EFFECT_NOTE_GAP;

  return source.map((point) => ({
    x: startX + (point.position / maxPosition) * effectWidth,
    y: baseY - (point.value / maxValue) * constants.NOTE_EFFECT_BEND_HEIGHT,
  }));
}

function createArrow(points: Point[]): SVGPathElement {
  const end = points[points.length - 1];
  const previous = points[points.length - 2] ?? {
    x: end.x,
    y: end.y + 1,
  };
  const direction = end.y <= previous.y ? 1 : -1;
  const size = constants.NOTE_EFFECT_ARROW_SIZE;
  return createPath(
    `M ${end.x - size} ${end.y + direction * size} L ${end.x} ${
      end.y
    } L ${end.x + size} ${end.y + direction * size}`,
  );
}

function bendLabel(bend: BendEffect): string {
  const semitones =
    bend.semitone_length > 0 ? Math.abs(bend.value / bend.semitone_length) : 0;
  if (Math.abs(semitones - 0.5) < 0.01) {
    return "1/2";
  }
  if (Math.abs(semitones - 1) < 0.01) {
    return "full";
  }
  if (semitones > 0) {
    return `${Number(semitones.toFixed(2))}`;
  }
  return "B";
}

function renderAccent(state: EffectRenderState) {
  const effect = state.entry.context.note.effect;
  if (!effect.accentuated_note && !effect.heavy_accentuated_note) {
    return;
  }

  const { context } = state.entry;
  const group = createEffectGroup(state, "accent");
  group.append(
    createText(
      state,
      effect.heavy_accentuated_note ? ">>" : ">",
      context.x,
      context.y - constants.NOTE_EFFECT_TEXT_OFFSET,
    ),
  );
  state.parent.append(group);
}

function renderTrill(state: EffectRenderState) {
  const trill = state.entry.context.note.effect.trill;
  if (!trill) {
    return;
  }

  const { context } = state.entry;
  const group = createEffectGroup(state, "trill");
  group.setAttribute("data-trill-fret", `${trill.fret}`);
  group.append(
    createText(
      state,
      "tr",
      context.x + constants.NOTE_EFFECT_HORIZONTAL_OFFSET,
      context.y -
        constants.NOTE_EFFECT_TEXT_OFFSET -
        constants.NOTE_EFFECT_NOTE_GAP,
    ),
  );
  state.parent.append(group);
}

function renderHarmonic(state: EffectRenderState) {
  const harmonic = state.entry.context.note.effect.harmonic;
  if (!harmonic) {
    return;
  }

  const { context } = state.entry;
  const halfWidth = Math.max(5, context.fontSize * 0.7);
  const halfHeight = Math.max(6, context.fontSize * 0.75);
  const group = createEffectGroup(state, "harmonic");
  const diamond = createSvgElement("polygon");
  diamond.setAttribute(
    "points",
    [
      `${context.x},${context.y - halfHeight}`,
      `${context.x + halfWidth},${context.y}`,
      `${context.x},${context.y + halfHeight}`,
      `${context.x - halfWidth},${context.y}`,
    ].join(" "),
  );
  applyPathDefaults(diamond);
  group.setAttribute("data-harmonic-kind", harmonic.kind);
  group.append(diamond);
  state.parent.append(group);
}

function renderSlides(state: EffectRenderState) {
  const slides = state.entry.context.note.effect.slides;
  slides.forEach((slide, index) => {
    const pathData = slidePath(state, slide, index);
    if (!pathData) {
      return;
    }

    const group = createEffectGroup(state, "slide");
    group.setAttribute("data-slide-type", slide);
    group.append(createPath(pathData));
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

function noteEdgeX(note: PositionedNote, direction: -1 | 1): number {
  return (
    note.context.x +
    direction * (note.glyphWidth / 2 + constants.NOTE_EFFECT_NOTE_GAP)
  );
}

function createEffectGroup(
  state: EffectRenderState,
  effect: string,
): SVGGElement {
  const group = createSvgElement("g");
  group.setAttribute(
    "class",
    `${state.classPrefix}-effect ${state.classPrefix}-effect--${effect}`,
  );
  group.setAttribute("data-effect", effect);
  group.setAttribute("data-string", `${state.entry.context.note.string}`);
  group.setAttribute(
    "data-measure-index",
    `${state.entry.context.measureIndex}`,
  );
  group.setAttribute("data-beat-index", `${state.entry.context.beatIndex}`);
  group.setAttribute("pointer-events", "none");
  return group;
}

function createText(
  state: EffectRenderState,
  value: string,
  x: number,
  y: number,
): SVGTextElement {
  const text = createSvgElement("text");
  text.setAttribute("fill", themeVar(ThemeVariables.COLOR_NOTE_FG));
  text.setAttribute("font-family", themeVar(ThemeVariables.FONT_NOTE));
  text.setAttribute(
    "font-size",
    `${effectFontSize(state.entry.context.fontSize)}`,
  );
  text.setAttribute("x", `${x}`);
  text.setAttribute("y", `${y}`);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.textContent = value;
  return text;
}

function createSpanText(
  value: string,
  x: number,
  y: number,
  fontSize: number,
): SVGTextElement {
  const text = createSvgElement("text");
  text.setAttribute("fill", themeVar(ThemeVariables.COLOR_MUTED));
  text.setAttribute("font-family", themeVar(ThemeVariables.FONT_LABEL));
  text.setAttribute("font-size", `${fontSize}`);
  text.setAttribute("x", `${x}`);
  text.setAttribute("y", `${y}`);
  text.setAttribute("text-anchor", "start");
  text.setAttribute("dominant-baseline", "central");
  text.textContent = value;
  return text;
}

function createPath(data: string): SVGPathElement {
  const path = createSvgElement("path");
  path.setAttribute("d", data);
  applyPathDefaults(path);
  return path;
}

function createMutedPath(data: string): SVGPathElement {
  const path = createSvgElement("path");
  path.setAttribute("d", data);
  applyPathDefaults(path, ThemeVariables.COLOR_MUTED);
  return path;
}

function applyPathDefaults(
  element: SVGElement,
  color:
    | typeof ThemeVariables.COLOR_NOTE_FG
    | typeof ThemeVariables.COLOR_MUTED = ThemeVariables.COLOR_NOTE_FG,
) {
  element.setAttribute("fill", "none");
  element.setAttribute("stroke", themeVar(color));
  element.setAttribute("stroke-width", `${constants.NOTE_EFFECT_STROKE_WIDTH}`);
  element.setAttribute("stroke-linecap", "round");
  element.setAttribute("stroke-linejoin", "round");
  element.setAttribute("vector-effect", "non-scaling-stroke");
}

function effectFontSize(noteFontSize: number): number {
  return Math.max(
    constants.NOTE_EFFECT_MIN_FONT_SIZE,
    noteFontSize * constants.NOTE_EFFECT_FONT_RATIO,
  );
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}
