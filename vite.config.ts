import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { packages } from "./package-lock.json";

function resolvePath(path: string) {
  return fileURLToPath(new URL(path, import.meta.url));
}

export default defineConfig({
  build: {
    outDir: resolvePath("./dist"),
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: resolvePath("./node_modules/zxing-wasm/dist/reader/*.wasm"),
          dest: ".",
        },
      ],
    }),
    visualizer(),
  ],
  define: {
    ZXING_WASM_VERSION: JSON.stringify(
      packages["node_modules/zxing-wasm"].version,
    ),
  },
});
