import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { compileSynthScore } from "../packages/engine/dist/index.js";

const [parserPath, corpusPath] = process.argv.slice(2);
assert.ok(
  parserPath && corpusPath,
  "Usage: node scripts/verify-parser-integration.mjs <nodejs parser.js> <fixture directory>",
);
const parser = await import(pathToFileURL(path.resolve(parserPath)).href);
const counts = {};
const failures = [];
let notes = 0;
for (const file of (await readdir(corpusPath)).sort()) {
  const extension = path.extname(file).toLowerCase();
  if (![".gp3", ".gp4", ".gp5", ".gpx", ".gp"].includes(extension)) {
    continue;
  }
  try {
    const song = parser.parse_guitar_pro(
      await readFile(path.join(corpusPath, file)),
      file,
    );
    const original = JSON.stringify(song);
    const score = compileSynthScore(song);
    assert.ok(
      Number.isFinite(score.durationMs) && score.durationMs >= 0,
      "Invalid song duration",
    );
    assert.equal(
      JSON.stringify(song),
      original,
      "Compiler mutated parser output",
    );
    assert.deepEqual(
      compileSynthScore(song),
      score,
      "Non-deterministic events",
    );
    for (const note of score.notes) {
      assert.ok(
        Number.isFinite(note.startMs) && note.startMs >= 0,
        "Invalid onset",
      );
      assert.ok(
        Number.isFinite(note.endMs) && note.endMs > note.startMs,
        `Invalid note interval ${note.startMs}..${note.endMs}`,
      );
      assert.ok(note.endMs <= score.durationMs + 0.001, "Note outlives score");
      assert.ok(
        Number.isFinite(note.midi) && note.midi >= 0 && note.midi <= 127,
        "Invalid pitch",
      );
      assert.ok(
        Number.isFinite(note.velocity) &&
          note.velocity >= 0 &&
          note.velocity <= 1,
        "Invalid velocity",
      );
      for (const point of note.pitch ?? []) {
        assert.ok(
          Number.isFinite(point.offsetMs) && Number.isFinite(point.cents),
          "Invalid pitch curve",
        );
      }
    }
    counts[extension] = (counts[extension] ?? 0) + 1;
    notes += score.notes.length;
  } catch (error) {
    failures.push({ file, error: String(error) });
  }
}
process.stdout.write(
  JSON.stringify({ counts, notes, failures }, null, 2) + "\n",
);
assert.ok(Object.keys(counts).length === 5, "Expected GP3/4/5/GPX/GP fixtures");
assert.equal(failures.length, 0, "Parser-to-engine integration failed");
