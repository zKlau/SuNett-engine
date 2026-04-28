import "./style.css";

import { parse_guitar_pro } from "sunett-parser";
import type { Song } from "../../src/types/song.ts";

async function main(filePath: string) {
  const response = await fetch(filePath);
  const bytes = new Uint8Array(await response.arrayBuffer());

  try {
    const song: Song = parse_guitar_pro(bytes, filePath);

    for (const measure in song.measure_headers) {
      console.log("Measure:", measure);
      console.log("Tempo:", song.measure_headers[measure].tempo);
      console.log("Repeat Open:", song.measure_headers[measure].repeat_open);
      console.log("Repeat Close:", song.measure_headers[measure].repeat_close);
      console.log(
        "Repeat Alternative:",
        song.measure_headers[measure].repeat_alternative,
        "\n ",
      );
      console.log(
        "Key Signature:",
        song.measure_headers[measure].key_signature,
        "\n ",
      );
    }

    console.log("Notes", song.tracks[0]?.measures[0].voices[0].beats[0].notes);
    //! Bar Ticks = (960 * 4 / DenominatorValue) * Numerator
    console.log(
      song.tracks[0]?.measures[0].voices[0].beats[0].notes[0].effect.bend,
    );
  } catch (e) {
    console.error("Parsing failed:", e);
  }
}

// main("/tabs/sweetChild.gp3");
main("/tabs/test.gpx");
