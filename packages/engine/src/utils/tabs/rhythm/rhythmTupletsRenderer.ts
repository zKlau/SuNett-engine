import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import { ThemeVariables, themeVar } from "../../../theme/variables";
import type { RhythmBeat } from "../../../types/UI/rhythmRender";
import { appendRhythmGroup, tupletKey } from "./rhythmGroups";
import { createRhythmPath } from "./rhythmSvg";
import { createSvgElement } from "../svg";

export function renderTuplets(
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
      appendRhythmGroup(groups, group);
      group = [];
      key = "";
      return;
    }
    if (key !== "" && currentKey !== key) {
      appendRhythmGroup(groups, group);
      group = [];
    }
    group.push(entry);
    key = currentKey;
  });
  appendRhythmGroup(groups, group);
  return groups;
}
