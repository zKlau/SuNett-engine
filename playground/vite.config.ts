import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import { fileURLToPath } from "node:url";

export default defineConfig({
  build: {
    license: true,
    rolldownOptions: {
      input: {
        presentation: fileURLToPath(
          new URL("./presentation.html", import.meta.url),
        ),
        playground: fileURLToPath(new URL("./index.html", import.meta.url)),
      },
    },
  },
  plugins: [wasm()],
});
