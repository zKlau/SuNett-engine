import type { Track } from "../../types/track";

// The parser preserves each file's native string order, but the two Guitar Pro
// formats disagree: .gp3/4/5 store strings highest-pitch first, while GPIF
// (.gp/.gpx) store them lowest-pitch first. Standard tablature draws the
// highest (thinnest) string on the top line, so a lowest-first tuning must be
// flipped end-for-end.
//
// This is a positional reversal decided from the tuning's overall direction —
// never a per-string pitch sort — so physically adjacent strings stay adjacent
// even for unusual (non-monotonic) tunings.
export function shouldReverseStrings(track: Track): boolean {
  const strings = track.strings;
  if (strings.length < 2) {
    return false;
  }

  const firstPitch = strings[0][1];
  const lastPitch = strings[strings.length - 1][1];
  return firstPitch < lastPitch;
}

// Visual row (0 = top line) for a 1-based string number. `reverse` flips the
// parser's order so the thinnest/highest string sits on top (standard tab);
// `invert` is the user-facing invertStrings option, layered on top. Both are
// mirror flips, so they compose: applying both cancels out.
export function stringDisplayRow(
  stringNumber: number,
  stringCount: number,
  reverse: boolean,
  invert: boolean,
): number {
  const index = stringNumber - 1;
  const flip = reverse !== invert;
  return flip ? stringCount - 1 - index : index;
}
