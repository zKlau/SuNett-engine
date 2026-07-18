import type { Track } from "../../types/track";

export function shouldReverseStrings(track: Track): boolean {
  const strings = track.strings;
  if (strings.length < 2) {
    return false;
  }

  const firstPitch = strings[0][1];
  const lastPitch = strings[strings.length - 1][1];
  return firstPitch < lastPitch;
}

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
