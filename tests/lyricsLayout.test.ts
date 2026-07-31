import { buildLyricsByMeasure } from "../src/utils/tabs/lyricsLayout";
import {
  makeBeat,
  makeMeasureFromVoices,
  makeNote,
  makeSong,
  makeTrack,
} from "./fixtures";

describe("buildLyricsByMeasure", () => {
  it("distributes lyric syllables across playable beats and measures", () => {
    const track = makeTrack(6, [
      makeMeasureFromVoices([
        [
          makeBeat({ notes: [makeNote()] }),
          makeBeat({ status: "Rest" }),
          makeBeat({ notes: [makeNote()] }),
        ],
      ]),
      makeMeasureFromVoices([
        [makeBeat({ notes: [makeNote()] }), makeBeat({ notes: [makeNote()] })],
      ]),
    ]);
    const song = {
      ...makeSong([track]),
      lyrics: {
        track_choice: 0,
        lines: [[0, 1, "Veins that pump fear"]],
      },
    };

    const lyrics = buildLyricsByMeasure(song, track, 0);

    expect(lyrics.get(0)).toEqual([
      { beatIndex: 0, lineIndex: 0, text: "Veins" },
      { beatIndex: 2, lineIndex: 0, text: "that" },
    ]);
    expect(lyrics.get(1)).toEqual([
      { beatIndex: 0, lineIndex: 0, text: "pump" },
      { beatIndex: 1, lineIndex: 0, text: "fear" },
    ]);
  });
});
