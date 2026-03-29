import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  build: {
    license: true,
  },
  plugins: [wasm()],
});
