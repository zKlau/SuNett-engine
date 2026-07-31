import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../theme/variables";
import type { Beat } from "../../types/beats/beat";
import type {
  RhythmBeat,
  RhythmRenderRequest,
} from "../../types/UI/rhythmRender";

export function renderRhythm(request: RhythmRenderRequest) {
  const voices = Array.from(
    new Set(request.beatLayouts.map((layout) => layout.voiceIndex)),
  );

  voices.forEach((voiceIndex) => {
    const beats = rhythmBeats(request, voiceIndex);
    const baseline =
      request.staffBottom +
      constants.RHYTHM_STEM_LENGTH +
      voiceIndex * constants.RHYTHM_VOICE_OFFSET;
    const staffCenter = (request.staffTop + request.staffBottom) / 2;

    beats.forEach(({ beat, layout }) => {
      if (beat.status === "Rest") {
        renderRest(request.parent, beat, layout.x, staffCenter);
        return;
      }
      if (beat.status !== "Normal") {
        return;
      }
      renderStem(request.parent, beat, layout.x, request.staffBottom, baseline);
    });

    renderBeamGroups(request.parent, beats, baseline);
    renderTuplets(request.parent, beats, baseline);
  });
}

function rhythmBeats(
  request: RhythmRenderRequest,
  voiceIndex: number,
): RhythmBeat[] {
  return request.beatLayouts.flatMap((layout) => {
    if (layout.voiceIndex !== voiceIndex) {
      return [];
    }
    const beat = request.measure.voices[voiceIndex]?.beats[layout.beatIndex];
    return beat ? [{ beat, layout }] : [];
  });
}

function renderStem(
  parent: SVGGElement,
  beat: Beat,
  x: number,
  bottomY: number,
  baseline: number,
) {
  if (beat.duration.value <= 1) {
    return;
  }

  parent.append(
    createRhythmPath(
      `M ${x} ${bottomY + constants.RHYTHM_STEM_START_OFFSET} V ${baseline}`,
      "rhythm-stem",
    ),
  );

  if (beat.duration.dotted || beat.duration.double_dotted) {
    const firstDot = createDot(x, baseline);
    parent.append(firstDot);
    if (beat.duration.double_dotted) {
      parent.append(createDot(x + constants.RHYTHM_DOT_OFFSET * 2, baseline));
    }
  }
}

function renderBeamGroups(
  parent: SVGGElement,
  beats: RhythmBeat[],
  baseline: number,
) {
  const groups: RhythmBeat[][] = [];
  let group: RhythmBeat[] = [];
  let quarterProgress = 0;
  let previousTuplet = "";

  beats.forEach((entry) => {
    const beamable =
      entry.beat.status !== "Empty" &&
      (entry.beat.duration.value >= 8 || entry.beat.display?.force_beam);
    const mustBreak = entry.beat.display?.break_beam;
    const currentTuplet = tupletKey(entry.beat);
    const crossesTupletBoundary =
      group.length > 0 &&
      currentTuplet !== previousTuplet &&
      (currentTuplet !== "" || previousTuplet !== "");

    if (crossesTupletBoundary || !beamable || mustBreak) {
      appendBeamGroup(groups, group);
      group = [];
    }
    if (beamable) {
      group.push(entry);
    }
    if (entry.beat.status !== "Empty") {
      quarterProgress += quarterLength(entry.beat);
    }
    previousTuplet = currentTuplet;

    if (quarterProgress >= constants.RHYTHM_BEAM_GROUP_QUARTERS) {
      appendBeamGroup(groups, group);
      group = [];
      quarterProgress %= constants.RHYTHM_BEAM_GROUP_QUARTERS;
    }
  });
  appendBeamGroup(groups, group);

  groups.forEach((entries) => {
    const sounding = entries.filter(({ beat }) => beat.status === "Normal");
    if (sounding.length === 0) {
      return;
    }
    if (sounding.length === 1) {
      renderFlags(parent, sounding[0], baseline);
      return;
    }
    renderBeamGroup(parent, entries, baseline);
  });
}

function renderTuplets(
  parent: SVGGElement,
  beats: RhythmBeat[],
  baseline: number,
) {
  collectTupletGroups(beats).forEach((group) => {
    const sounding = group.filter(({ beat }) => beat.status === "Normal");
    if (sounding.length < 2) {
      return;
    }

    const first = sounding[0];
    const last = sounding[sounding.length - 1];
    const startX = first.layout.x - constants.RHYTHM_TUPLET_BRACKET_OVERHANG;
    const endX = last.layout.x + constants.RHYTHM_TUPLET_BRACKET_OVERHANG;
    const middleX = (startX + endX) / 2;
    const y = baseline + constants.RHYTHM_TUPLET_BRACKET_OFFSET;
    const gap = constants.RHYTHM_TUPLET_LABEL_GAP;
    const cap = constants.RHYTHM_TUPLET_BRACKET_CAP_HEIGHT;
    const bracket = createRhythmPath(
      `M ${startX} ${y - cap} V ${y} H ${middleX - gap} M ${
        middleX + gap
      } ${y} H ${endX} V ${y - cap}`,
      "rhythm-tuplet-bracket",
    );
    const label = createSvgElement("text");
    label.setAttribute("class", "rhythm-tuplet-number");
    label.setAttribute("x", `${middleX}`);
    label.setAttribute("y", `${y}`);
    label.setAttribute("fill", themeVar(ThemeVariables.COLOR_MUTED));
    label.setAttribute("font-family", themeVar(ThemeVariables.FONT_LABEL));
    label.setAttribute("font-size", `${constants.RHYTHM_TUPLET_FONT_SIZE}`);
    label.setAttribute("font-style", "italic");
    label.setAttribute("font-weight", "600");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "central");
    label.textContent = `${first.beat.duration.tuplet_enters}`;
    parent.append(bracket, label);
  });
}

function collectTupletGroups(beats: RhythmBeat[]): RhythmBeat[][] {
  const groups: RhythmBeat[][] = [];
  let group: RhythmBeat[] = [];
  let key = "";

  beats.forEach((entry) => {
    const currentKey = tupletKey(entry.beat);
    if (currentKey === "") {
      appendBeamGroup(groups, group);
      group = [];
      key = "";
      return;
    }
    if (key !== "" && currentKey !== key) {
      appendBeamGroup(groups, group);
      group = [];
    }
    group.push(entry);
    key = currentKey;
  });
  appendBeamGroup(groups, group);
  return groups;
}

function tupletKey(beat: Beat): string {
  if (beat.duration.tuplet_enters <= 1) {
    return "";
  }
  return `${beat.duration.tuplet_enters}:${beat.duration.tuplet_times}`;
}

function appendBeamGroup(groups: RhythmBeat[][], group: RhythmBeat[]) {
  if (group.length > 0) {
    groups.push(group);
  }
}

function renderBeamGroup(
  parent: SVGGElement,
  beats: RhythmBeat[],
  baseline: number,
) {
  const sounding = beats.filter(({ beat }) => beat.status === "Normal");
  const first = sounding[0];
  const last = sounding[sounding.length - 1];
  parent.append(
    createRhythmPath(
      `M ${first.layout.x} ${baseline} H ${last.layout.x}`,
      "rhythm-beam",
      constants.RHYTHM_BEAM_WIDTH,
    ),
  );

  const maxLevel = Math.max(...beats.map(({ beat }) => beamLevel(beat)));
  for (let level = 2; level <= maxLevel; level += 1) {
    const y = baseline + (level - 1) * constants.RHYTHM_SECONDARY_BEAM_GAP;
    for (let index = 0; index < beats.length - 1; index += 1) {
      const left = beats[index];
      const right = beats[index + 1];
      if (beamLevel(left.beat) < level || beamLevel(right.beat) < level) {
        continue;
      }
      parent.append(
        createRhythmPath(
          `M ${left.layout.x} ${y} H ${right.layout.x}`,
          "rhythm-beam rhythm-beam-secondary",
          constants.RHYTHM_BEAM_WIDTH,
        ),
      );
    }
  }
}

function quarterLength(beat: Beat): number {
  let length = 4 / Math.max(1, beat.duration.value);
  if (beat.duration.dotted) {
    length *= 1.5;
  }
  if (beat.duration.double_dotted) {
    length *= 1.75;
  }
  const enters = Math.max(1, beat.duration.tuplet_enters);
  const times = Math.max(1, beat.duration.tuplet_times);
  return length * (times / enters);
}

function renderFlags(parent: SVGGElement, entry: RhythmBeat, baseline: number) {
  parent.append(
    createRhythmPath(
      `M ${entry.layout.x} ${baseline} H ${
        entry.layout.x + constants.RHYTHM_FLAG_WIDTH
      }`,
      "rhythm-flag",
      constants.RHYTHM_BEAM_WIDTH,
    ),
  );
}

function beamLevel(beat: Beat): number {
  if (beat.duration.value < 8) {
    return 0;
  }
  return Math.max(1, Math.floor(Math.log2(beat.duration.value / 4)));
}

function renderRest(
  parent: SVGGElement,
  beat: Beat,
  x: number,
  staffCenter: number,
) {
  const rest = createSvgElement("text");
  rest.setAttribute("class", "rhythm-rest");
  rest.setAttribute("x", `${x}`);
  rest.setAttribute("y", `${staffCenter}`);
  rest.setAttribute("fill", themeVar(ThemeVariables.COLOR_REST));
  rest.setAttribute("font-family", "Bravura, Segoe UI Symbol, serif");
  rest.setAttribute("font-size", `${constants.RHYTHM_REST_FONT_SIZE}`);
  rest.setAttribute("text-anchor", "middle");
  rest.setAttribute("dominant-baseline", "central");
  rest.setAttribute("data-duration", `${beat.duration.value}`);
  rest.textContent = restGlyph(beat.duration.value);
  parent.append(rest);
}

function restGlyph(duration: number): string {
  if (duration <= 1) {
    return "\u{1d13b}";
  }
  if (duration === 2) {
    return "\u{1d13c}";
  }
  if (duration === 4) {
    return "\u{1d13d}";
  }
  if (duration === 8) {
    return "\u{1d13e}";
  }
  if (duration === 16) {
    return "\u{1d13f}";
  }
  return "\u{1d140}";
}

function createDot(x: number, y: number): SVGCircleElement {
  const dot = createSvgElement("circle");
  dot.setAttribute("class", "rhythm-dot");
  dot.setAttribute("cx", `${x + constants.RHYTHM_DOT_OFFSET}`);
  dot.setAttribute("cy", `${y}`);
  dot.setAttribute("r", `${constants.RHYTHM_DOT_RADIUS}`);
  dot.setAttribute("fill", themeVar(ThemeVariables.COLOR_MUTED));
  return dot;
}

function createRhythmPath(
  data: string,
  className: string,
  width = constants.NOTE_EFFECT_STROKE_WIDTH,
): SVGPathElement {
  const path = createSvgElement("path");
  path.setAttribute("class", className);
  path.setAttribute("d", data);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", themeVar(ThemeVariables.COLOR_MUTED));
  path.setAttribute("stroke-width", `${width}`);
  path.setAttribute("stroke-linecap", "butt");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  return path;
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}
