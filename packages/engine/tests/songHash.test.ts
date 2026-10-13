import type { Song } from "../src/types/song";
import { computeSongHash } from "../src/utils/song/songHash";

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    name: "Song",
    artist: "Artist",
    album: "Album",
    tempo: 120,
    measure_headers: [],
    tracks: [{ name: "Guitar", measures: [] }],
    ...overrides,
  } as unknown as Song;
}

describe("computeSongHash", () => {
  it("is stable for the same song", () => {
    expect(computeSongHash(makeSong())).toBe(computeSongHash(makeSong()));
  });

  it("changes when the song name changes", () => {
    expect(computeSongHash(makeSong({ name: "A" }))).not.toBe(
      computeSongHash(makeSong({ name: "B" })),
    );
  });

  it("changes when the track structure changes", () => {
    const one = makeSong({
      tracks: [{ name: "Guitar", measures: [] }],
    } as unknown as Partial<Song>);
    const two = makeSong({
      tracks: [
        { name: "Guitar", measures: [] },
        { name: "Bass", measures: [] },
      ],
    } as unknown as Partial<Song>);

    expect(computeSongHash(one)).not.toBe(computeSongHash(two));
  });

  it("returns a padded hex string", () => {
    expect(computeSongHash(makeSong())).toMatch(/^[0-9a-f]{8}$/);
  });
});
