import type { Beat } from "../../../types/beats/beat";
import type { RhythmBeat } from "../../../types/UI/rhythmRender";

export function appendRhythmGroup(groups: RhythmBeat[][], group: RhythmBeat[]) {
  if (group.length > 0) {
    groups.push(group);
  }
}

export function tupletKey(beat: Beat): string {
  if (beat.duration.tuplet_enters <= 1) {
    return "";
  }
  return `${beat.duration.tuplet_enters}:${beat.duration.tuplet_times}`;
}
