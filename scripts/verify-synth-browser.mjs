import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [synthArg, parserArg, corpusArg] = process.argv.slice(2);
assert.ok(
  synthArg && parserArg && corpusArg,
  "Usage: node scripts/verify-synth-browser.mjs <synth repo> <bundler parser directory> <fixtures>",
);
const synth = path.resolve(synthArg);
const parser = path.resolve(parserArg);
const engine = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(synth, "package.json"));
const { build } = require("esbuild");
const { chromium } = require("playwright");
const wasm = await readFile(path.join(parser, "scorelib_bg.wasm"));
const result = await build({
  entryPoints: [path.join(synth, "playground/src/player.ts")],
  bundle: true,
  write: false,
  outdir: "out",
  format: "iife",
  target: "es2022",
  minify: true,
  plugins: [
    {
      name: "local-library-verification",
      setup(builder) {
        builder.onResolve(
          { filter: /(?:songScore|trackInstrument)$/ },
          (args) => ({
            path: path.join(
              engine,
              "src/audio",
              path.basename(args.path) + ".ts",
            ),
          }),
        );
        builder.onResolve({ filter: /^sunett-parser$/ }, () => ({
          path: path.join(parser, "scorelib.js"),
        }));
        builder.onResolve({ filter: /\.txt\?raw$/ }, (args) => ({
          path: path.resolve(args.resolveDir, args.path.replace(/\?raw$/, "")),
          namespace: "raw-text",
        }));
        builder.onLoad(
          { filter: /.*/, namespace: "raw-text" },
          async (args) => ({
            contents: await readFile(args.path, "utf8"),
            loader: "text",
          }),
        );
        builder.onLoad({ filter: /scorelib\.js$/ }, () => ({
          contents: `import * as glue from './scorelib_bg.js';
        const bytes=Uint8Array.from(atob('${wasm.toString("base64")}'),c=>c.charCodeAt(0));
        const instance=new WebAssembly.Instance(new WebAssembly.Module(bytes),{'./scorelib_bg.js':glue});
        glue.__wbg_set_wasm(instance.exports); instance.exports.__wbindgen_start();
        export {parse_guitar_pro} from './scorelib_bg.js';`,
          resolveDir: parser,
          loader: "js",
        }));
      },
    },
  ],
});
const js = result.outputFiles.find((file) => file.path.endsWith(".js")).text;
const css = result.outputFiles.find((file) => file.path.endsWith(".css")).text;
const html = (
  await readFile(path.join(synth, "playground/player.html"), "utf8")
)
  .replace("</head>", `<style>${css}</style></head>`)
  .replace(
    '<script type="module" src="/src/player.ts"></script>',
    `<script>${js.replaceAll("</script", "<\\/script")}</script>`,
  );
const assets = path.join(synth, "downloads/audio");
const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/") {
    response.setHeader("Content-Type", "text/html");
    response.end(html);
    return;
  }
  const file = path.resolve(
    assets,
    "." + decodeURIComponent(url.pathname.replace(/^\/audio/, "")),
  );
  if (
    !url.pathname.startsWith("/audio/") ||
    !file.startsWith(assets + path.sep)
  ) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.setHeader(
    "Content-Type",
    file.endsWith(".js") ? "text/javascript" : "application/octet-stream",
  );
  const stream = createReadStream(file);
  stream.on("error", () => {
    response.statusCode = 404;
    response.end();
  });
  stream.pipe(response);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  headless: true,
  channel: "msedge",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.audioMeters = [];
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (destination, ...args) {
      if (destination instanceof AudioDestinationNode) {
        const meter = this.context.createAnalyser();
        meter.fftSize = 2048;
        window.audioMeters.push(meter);
        connect.call(this, meter, ...args);
        return connect.call(meter, destination);
      }
      return connect.call(this, destination, ...args);
    };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.locator("#showcase").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#title").textContent === "Instrument showcase",
  );
  await page.locator("#play").click();
  await page.waitForFunction(
    () => Number(document.querySelector("#seek").value) > 500,
    null,
    { timeout: 60000 },
  );
  const level = await page.evaluate(async () => {
    let peak = 0;
    for (let i = 0; i < 12; i++) {
      for (const meter of window.audioMeters) {
        const samples = new Float32Array(meter.fftSize);
        meter.getFloatTimeDomainData(samples);
        if (!samples.every(Number.isFinite)) {
          throw Error("Nonfinite audio output");
        }
        peak = Math.max(peak, ...samples.map(Math.abs));
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return peak;
  });
  assert.ok(level > 0.00001, "Expected audible output from the local compiler");
  await page.locator("#stop").click();
  assert.equal(await page.locator("#seek").inputValue(), "0");
  for (const filename of [
    "Effects.gp3",
    "Effects.gp4",
    "RSE.gp5",
    "slur-notes-effect-mask.gpx",
    "slur-notes-effect-mask.gp",
  ]) {
    await page
      .locator("#file")
      .setInputFiles(path.resolve(corpusArg, filename));
    await page.waitForFunction(() =>
      /Ready|Could not|supported/i.test(
        document.querySelector("#message").textContent,
      ),
    );
    assert.ok(
      (await page.locator("#message").textContent()).includes("Ready"),
      `${filename}: ${await page.locator("#message").textContent()}`,
    );
    await page.locator("#play").click();
    await page.waitForFunction(
      () => Number(document.querySelector("#seek").value) > 100,
      null,
      { timeout: 60000 },
    );
    await page.locator("#pause").click();
    const paused = await page.locator("#seek").inputValue();
    await page.waitForTimeout(100);
    assert.equal(await page.locator("#seek").inputValue(), paused);
    await page.locator("#stop").click();
  }
  assert.deepEqual(errors, []);
  process.stdout.write(
    JSON.stringify({ peak: level, browserErrors: errors, playback: "passed" }) +
      "\n",
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
