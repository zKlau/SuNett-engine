import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import packageJson from "../package.json";
import tsupConfig from "../tsup.config";

const ROOT = join(__dirname, "..");
const PUBLIC_DIR = "styles";

function listStylesheets(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listStylesheets(path);
    }
    return entry.name.endsWith(".css") ? [path] : [];
  });
}

/** Maps a `./dist/...` export target back to the source file tsup copies it from. */
function sourceFor(target: string): string {
  return join(ROOT, PUBLIC_DIR, target.replace(/^\.\/dist\//, ""));
}

const cssExports = Object.entries(packageJson.exports).filter(
  (entry): entry is [string, string] => typeof entry[1] === "string",
);

describe("stylesheet package exports", () => {
  it("copies the stylesheet source directory into dist", () => {
    expect(tsupConfig).toMatchObject({ publicDir: PUBLIC_DIR });
  });

  it.each(cssExports)("%s resolves to a source stylesheet", (_, target) => {
    expect(existsSync(sourceFor(target))).toBe(true);
  });

  it("exports every shipped stylesheet", () => {
    const exported = new Set(cssExports.map(([, target]) => sourceFor(target)));
    const shipped = listStylesheets(join(ROOT, PUBLIC_DIR));

    const missing = shipped
      .filter((file) => !exported.has(file))
      .map((file) => relative(ROOT, file).split(sep).join("/"));

    expect(missing).toEqual([]);
  });
});
