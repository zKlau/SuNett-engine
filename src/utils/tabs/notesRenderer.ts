import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Beat } from "../../types/beats/beat";
import type { Measure } from "../../types/measure";
import type { Note } from "../../types/note";
import type { MeasureBounds } from "../../types/UI/measureBounds";
import type { BeatLayout } from "../../types/UI/noteLayout";
import type { NoteRenderContext } from "../../types/UI/noteRenderContext";
import type { PositionedNote } from "../../types/UI/noteEffectsRender";
import type { normalizeOptions } from "./tabsOptionsNormalizer";
import type { NoteMetrics } from "./noteMetrics";
import { renderNoteEffects } from "./noteEffectsRenderer";
import { stringDisplayRow } from "./stringOrder";
import { ThemeVariables, themeVar } from "../../theme/variables";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg" as const;

type NoteConfig = ReturnType<typeof normalizeOptions>["notes"];

type NotesRenderRequest = {
  parent: SVGGElement;
  measure: Measure;
  measureIndex: number;
  beatLayouts: BeatLayout[];
  bounds: MeasureBounds;
  stringCount: number;
  invertStrings?: boolean;
  reverseStrings?: boolean;
  config: NoteConfig;
  metrics: NoteMetrics;
  previousNotes?: PositionedNote[];
};

type NoteRenderRequest = {
  parent: SVGGElement;
  measure: Measure;
  measureIndex: number;
  beat: Beat;
  beatLayout: BeatLayout;
  note: Note;
  bounds: MeasureBounds;
  stringCount: number;
  invertStrings: boolean;
  reverseStrings: boolean;
  config: NoteConfig;
  metrics: NoteMetrics;
};

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
  for (const beatLayout of beatLayouts) {
    const voice = measure.voices[beatLayout.voiceIndex];
    const beat = voice?.beats[beatLayout.beatIndex];
    if (!beat || beat.status === "Rest") {
      continue;
    }
    for (const note of beat.notes) {
      const noteRequest = {
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
    }
  }

  const positionedNotes = notes.map(positionNote);
  positionedNotes.forEach(({ request: noteRequest, context }, index) => {
    if (!isInternalTie(positionedNotes, index)) {
      renderNote(noteRequest, context);
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

function isInternalTie(
  notes: ReturnType<typeof positionNote>[],
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

function positionNote(request: NoteRenderRequest) {
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
    createElement: createSvgElement,
  };
  const glyphWidth = resolveGlyphWidth(
    noteLabel(note),
    context.fontSize,
    config,
    metrics,
  );

  return { request, context, width: beatLayout.width, glyphWidth };
}

function renderNote(request: NoteRenderRequest, context: NoteRenderContext) {
  const { parent, config, metrics } = request;
  const customElement = config.render?.(context);
  if (customElement) {
    attachInteractions(customElement, context, config);
    parent.append(customElement);
    return;
  }

  const noteGroup = buildDefaultNote(context, config, metrics);
  config.onCreate?.(noteGroup, context);
  attachInteractions(noteGroup, context, config);
  parent.append(noteGroup);
}

function buildDefaultNote(
  context: NoteRenderContext,
  config: NoteConfig,
  metrics: NoteMetrics,
): SVGGElement {
  const { note, x, y, fontSize } = context;
  const prefix = config.classPrefix;
  const group = context.createElement("g");

  const modifiers = modifierClasses(note, prefix);
  const className = modifiers ? `${prefix} ${modifiers}` : prefix;

  group.setAttribute("class", className);
  group.setAttribute("x", `${x}`);
  group.setAttribute("y", `${y}`);
  group.setAttribute("data-fret", `${note.value}`);
  group.setAttribute("data-string", `${note.string}`);
  group.setAttribute("data-kind", note.kind);
  group.setAttribute("data-beat-index", `${context.beatIndex}`);
  group.setAttribute("data-measure-index", `${context.measureIndex}`);
  group.setAttribute("data-voice-index", `${context.voiceIndex}`);

  const label = noteLabel(note);
  const glyphWidth = resolveGlyphWidth(label, fontSize, config, metrics);

  if (config.background) {
    const bg = context.createElement("rect");
    bg.setAttribute("class", `${prefix}-bg`);
    bg.setAttribute("fill", themeVar(ThemeVariables.COLOR_NOTE_BG));
    bg.setAttribute("stroke", "none");
    bg.setAttribute("x", `${x - glyphWidth / 2}`);
    bg.setAttribute("y", `${y - metrics.backgroundHeight / 2}`);
    bg.setAttribute("width", `${glyphWidth}`);
    bg.setAttribute("height", `${metrics.backgroundHeight}`);
    group.append(bg);
  }

  const text = context.createElement("text");
  text.setAttribute("class", `${prefix}-text`);
  text.setAttribute("fill", themeVar(ThemeVariables.COLOR_NOTE_FG));
  text.setAttribute("font-family", themeVar(ThemeVariables.FONT_NOTE));
  text.setAttribute("x", `${x}`);
  text.setAttribute("y", `${y}`);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.setAttribute("font-size", `${fontSize}`);
  text.textContent = label;
  group.append(text);

  return group;
}

function resolveGlyphWidth(
  label: string,
  fontSize: number,
  config: NoteConfig,
  metrics: NoteMetrics,
): number {
  return Math.max(
    metrics.backgroundHeight,
    label.length * fontSize * constants.NOTE_GLYPH_WIDTH_RATIO +
      config.paddingX * 2,
  );
}

function noteLabel(note: Note): string {
  const value = note.kind === "Dead" ? "x" : `${note.value}`;
  return note.effect?.ghost_note || note.kind === "Tie" ? `(${value})` : value;
}

function modifierClasses(note: Note, prefix: string): string {
  const modifiers: string[] = [];
  if (note.kind === "Dead") {
    modifiers.push(`${prefix}--dead`);
  }
  if (note.kind === "Tie") {
    modifiers.push(`${prefix}--tie`);
  }
  if (note.effect?.ghost_note) {
    modifiers.push(`${prefix}--ghost`);
  }
  if (note.effect?.hammer) {
    modifiers.push(`${prefix}--hammer`);
  }
  if (note.effect?.palm_mute) {
    modifiers.push(`${prefix}--palm-mute`);
  }
  if (note.effect?.let_ring) {
    modifiers.push(`${prefix}--let-ring`);
  }
  if (note.effect?.bend && note.effect.bend.kind !== "None") {
    modifiers.push(`${prefix}--bend`);
  }
  if (note.effect?.vibrato) {
    modifiers.push(`${prefix}--vibrato`);
  }
  if (note.effect?.staccato) {
    modifiers.push(`${prefix}--staccato`);
  }
  if (note.effect?.accentuated_note || note.effect?.heavy_accentuated_note) {
    modifiers.push(`${prefix}--accent`);
  }
  if (note.effect?.trill) {
    modifiers.push(`${prefix}--trill`);
  }
  if (note.effect?.harmonic) {
    modifiers.push(`${prefix}--harmonic`);
  }
  if (note.effect?.slides.some((slide) => slide !== "None")) {
    modifiers.push(`${prefix}--slide`);
  }
  return modifiers.join(" ");
}

function attachInteractions(
  element: SVGElement,
  context: NoteRenderContext,
  config: NoteConfig,
) {
  const { onClick, onPointerEnter, onPointerLeave } = config;

  if (onClick) {
    element.addEventListener("click", (event) => onClick(context, event));
    element.setAttribute("cursor", "pointer");
  }
  if (onPointerEnter) {
    element.addEventListener("pointerenter", (event) =>
      onPointerEnter(context, event),
    );
  }
  if (onPointerLeave) {
    element.addEventListener("pointerleave", (event) =>
      onPointerLeave(context, event),
    );
  }
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(tag: K) {
  return document.createElementNS(SVG_NAMESPACE, tag);
}
