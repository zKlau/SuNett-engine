import { TabsRendererConstants as constants } from "../../../constants/tabRendererConstants";
import type { Beat } from "../../../types/beats/beat";
import type { RhythmBeat } from "../../../types/UI/rhythmRender";
import { appendRhythmGroup, tupletKey } from "./rhythmGroups";
import { createRhythmPath } from "./rhythmSvg";

export function renderBeamGroups(
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
      appendRhythmGroup(groups, group);
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
      appendRhythmGroup(groups, group);
      group = [];
      quarterProgress %= constants.RHYTHM_BEAM_GROUP_QUARTERS;
    }
  });
  appendRhythmGroup(groups, group);

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
