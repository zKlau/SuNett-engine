import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import type { Beat } from "../../types/beats/beat";
import type { Measure } from "../../types/measure";
import type { Note } from "../../types/note";
import type { MeasureBounds } from "../../types/UI/measureBounds";
import type { BeatLayout } from "../../types/UI/noteLayout";
import type { NoteRenderContext } from "../../types/UI/noteRenderContext";
import type { normalizeOptions } from "./tabsOptionsNormalizer";
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
  } = request;

  for (const beatLayout of beatLayouts) {
    const voice = measure.voices[beatLayout.voiceIndex];
    const beat = voice?.beats[beatLayout.beatIndex];
    if (!beat || beat.status === "Rest") {
      continue;
    }
    for (const note of beat.notes) {
      renderNote({
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
      });
    }
  }
}

function renderNote(request: NoteRenderRequest) {
  const {
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
  } = request;

  if (note.kind === "Rest") {
    return;
  }
  if (note.string < 0 || note.string >= stringCount) {
    return;
  }

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
    fontSize: config.fontSize,
    createElement: createSvgElement,
  };

  const customElement = config.render?.(context);
  if (customElement) {
    attachInteractions(customElement, context, config);
    parent.append(customElement);
    return;
  }

  const noteGroup = buildDefaultNote(context, config);
  config.onCreate?.(noteGroup, context);
  attachInteractions(noteGroup, context, config);
  parent.append(noteGroup);
}

function buildDefaultNote(
  context: NoteRenderContext,
  config: NoteConfig,
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
  const glyphWidth = Math.max(
    config.backgroundHeight,
    label.length * fontSize * 0.62 + config.paddingX * 2,
  );

  if (config.background) {
    const bg = context.createElement("rect");
    bg.setAttribute("class", `${prefix}-bg`);
    bg.setAttribute("fill", themeVar(ThemeVariables.COLOR_NOTE_BG));
    bg.setAttribute("stroke", "none");
    bg.setAttribute("x", `${x - glyphWidth / 2}`);
    bg.setAttribute("y", `${y - config.backgroundHeight / 2}`);
    bg.setAttribute("width", `${glyphWidth}`);
    bg.setAttribute("height", `${config.backgroundHeight}`);
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

function noteLabel(note: Note): string {
  if (note.kind === "Dead") {
    return "x";
  }
  return `${note.value}`;
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
