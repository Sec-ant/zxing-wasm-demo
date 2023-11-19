import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";
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
    visualizer({
      emitFile: true,
    }) as PluginOption,
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globDirectory: resolvePath("./dist"),
        globPatterns: ["**/*"],
        globIgnores: [
          "**/node_modules/**/*",
          "sw.js",
          "workbox-*.js",
          "stats.html",
        ],
      },
    }),
  ],
  define: {
    ZXING_WASM_VERSION: JSON.stringify(
      packages["node_modules/zxing-wasm"].version,
    ),
  },
});
