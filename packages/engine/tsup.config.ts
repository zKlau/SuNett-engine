import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  publicDir: "styles",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
