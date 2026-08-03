import { TabsRendererConstants as constants } from "../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../theme/variables";
import type { Beat } from "../../types/beats/beat";
import type {
  RhythmBeat,
  RhythmRenderRequest,
} from "../../types/UI/rhythmRender";
import { renderRest } from "./rhythm/restRenderer";
import { renderBeamGroups } from "./rhythm/rhythmBeamsRenderer";
import { createRhythmPath, createSvgElement } from "./rhythm/rhythmSvg";
import { renderTuplets } from "./rhythm/rhythmTupletsRenderer";

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
    parent.append(createDot(x, baseline));
    if (beat.duration.double_dotted) {
      parent.append(createDot(x + constants.RHYTHM_DOT_OFFSET * 2, baseline));
    }
  }
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
