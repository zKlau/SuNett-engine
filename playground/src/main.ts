import "./style.css";

import { setupCounter } from "./counter.ts";
import { parse_guitar_pro } from "sunett-parser";

async function main(filePath: string) {
  const response = await fetch(filePath);
  const bytes = new Uint8Array(await response.arrayBuffer());

  try {
    const song = parse_guitar_pro(bytes, filePath);

    console.log("Parsed Song:", song);
    console.log("Title:", song.name);
    console.log("Tracks:", song.tracks.length);
    console.log("Notes", song.tracks[0]?.measures[0].voices[0].beats[0].notes);
  } catch (e) {
    console.error("Parsing failed:", e);
  }
}

main("/tabs/barre.gp");

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
