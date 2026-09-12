import type { Measure } from "../types/measure";
import type { Song } from "../types/song";
import type { Track } from "../types/track";

export class SongHelper {
  private song: Song;
  constructor(song: Song) {
    this.song = song;
  }

  get name() {
    return this.song.name;
  }

  get tracks(): Track[] {
    return this.song.tracks;
  }

  getTrack(index: number): Track {
    return this.song.tracks[index];
  }
  getTrackName(track: Track): string {
    return track.name;
  }

  getMeaseures(): Map<number, Measure[]> {
    return new Map(
      this.song.tracks.map((track, index) => [index, track.measures]),
    );
  }
}
