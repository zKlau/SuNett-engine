import type { Song } from "../../types/song";
import type { Track } from "../../types/track";
import type { LyricsByMeasure } from "../../types/UI/measureNotationRender";

export function buildLyricsByMeasure(
  song: Song,
  track: Track,
  trackIndex: number,
): LyricsByMeasure {
  const result: LyricsByMeasure = new Map();
  const lyrics = song.lyrics;
  if (!lyrics || !isLyricsTrack(lyrics.track_choice, trackIndex)) {
    return result;
  }

  lyrics.lines.forEach(([lineIndex, startMeasure, text]) => {
    const syllables = lyricSyllables(text);
    let syllableIndex = 0;

    for (
      let measureIndex = Math.max(0, startMeasure - 1);
      measureIndex < track.measures.length && syllableIndex < syllables.length;
      measureIndex += 1
    ) {
      const beats = track.measures[measureIndex].voices[0]?.beats ?? [];
      beats.forEach((beat, beatIndex) => {
        if (beat.status === "Rest" || syllableIndex >= syllables.length) {
          return;
        }
        const entries = result.get(measureIndex) ?? [];
        entries.push({
          beatIndex,
          lineIndex,
          text: syllables[syllableIndex],
        });
        result.set(measureIndex, entries);
        syllableIndex += 1;
      });
    }
  });

  return result;
}

function isLyricsTrack(choice: number, trackIndex: number): boolean {
  return choice === trackIndex || choice - 1 === trackIndex;
}

function lyricSyllables(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((syllable) => syllable.length > 0);
}
