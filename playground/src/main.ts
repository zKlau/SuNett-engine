import "./style.css";

import { parse_guitar_pro } from "sunett-parser";
import type {Song} from "../../src/types/song.ts";



async function main(filePath: string) {
  const response = await fetch(filePath);
  const bytes = new Uint8Array(await response.arrayBuffer());

  try {
    const song:Song = parse_guitar_pro(bytes, filePath);
    console.log("Title:", song.tracks[0].measures[0].clef);
    // console.log("Tracks:", song.tracks.length);
    // console.log("Notes", song.tracks[0]?.measures[0].voices[0].beats[0].notes);
  } catch (e) {
    console.error("Parsing failed:", e);
  }
}





main("/tabs/hpb.gp5");

