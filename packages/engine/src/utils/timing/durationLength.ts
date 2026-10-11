import type { Duration } from "../../types/duration";

const DOTTED_MULTIPLIER = 1.5;
const DOUBLE_DOTTED_MULTIPLIER = 1.75;

/**
 * The length of a note duration as a fraction of a whole note, including dots
 * and tuplets. A quarter note is `0.25`, a dotted eighth `0.1875`.
 * @param duration The parsed duration.
 * @returns The duration in whole notes.
 */
export function durationInWholeNotes(duration: Duration): number {
  const base = 1 / Math.max(1, duration.value);

  let multiplier = 1;
  if (duration.dotted) {
    multiplier *= DOTTED_MULTIPLIER;
  }
  if (duration.double_dotted) {
    multiplier *= DOUBLE_DOTTED_MULTIPLIER;
  }

  const tupletEnters = Math.max(1, duration.tuplet_enters);
  const tupletTimes = Math.max(1, duration.tuplet_times);
  return base * multiplier * (tupletTimes / tupletEnters);
}
